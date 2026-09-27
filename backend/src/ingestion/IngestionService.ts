// Load all source self-registrations before any registry lookup
import './sources/index';

import { JobSource, ScrapingStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { getSource, getEnabledSources } from './registry';
import { isSourceError } from './errors';
import type { IngestionParams, IngestionResult, NormalisedJob } from './types';

// ─────────────────────────────────────────────────────────────
// IngestionService — orchestrates one ingestion run per source:
//
//   1. Validate source config (throws → mark FAILED immediately)
//   2. Open a ScrapingLog row (status = STARTED)
//   3. Delegate fetching to the registered source handler
//   4. Normalise every RawJob via source.normalizeAll()
//   5. Upsert each job into the DB (skip duplicates gracefully)
//   6. Close the ScrapingLog row (status = SUCCESS | FAILED)
//   7. Return an IngestionResult summary
// ─────────────────────────────────────────────────────────────

export class IngestionService {
  /**
   * Run ingestion for a single source.
   *
   * @param userId  - ID of the user who triggered the run (logged for audit)
   * @param source  - Which JobSource to fetch from
   * @param params  - Query, location, and limit passed to the source
   */
  async run(
    userId: string,
    source: JobSource,
    params: IngestionParams,
  ): Promise<IngestionResult> {
    const sourceHandler = getSource(source);
    const { displayName } = sourceHandler.capabilities;

    const result: IngestionResult = {
      source,
      fetched:  0,
      created:  0,
      skipped:  0,
      failed:   0,
      errors:   [],
      logId:    '',
    };

    // ── 1. Pre-flight: validate config before touching the DB ─
    try {
      sourceHandler.validateConfig();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[Ingestion] skipping disabled source — source=${source} reason="${message}"`,
      );
      result.errors.push(message);
      return result;
    }

    // ── 2. Open scraping log ──────────────────────────────────
    const log = await prisma.scrapingLog.create({
      data: {
        userId,
        source,
        query:    params.query,
        location: params.location ?? null,
        status:   ScrapingStatus.STARTED,
      },
    });

    result.logId = log.id;

    logger.info(
      `[Ingestion] run started — source=${source} (${displayName}) ` +
      `query="${params.query}" logId=${log.id}`,
    );

    try {
      // ── 3. Fetch raw jobs ───────────────────────────────────
      const rawJobs  = await sourceHandler.fetch(params);
      result.fetched = rawJobs.length;

      logger.info(
        `[Ingestion] fetched ${rawJobs.length} raw jobs from ${source} (${displayName})`,
      );

      // ── 4. Normalise ────────────────────────────────────────
      const normalisedJobs = sourceHandler.normalizeAll(rawJobs);

      // Warn when normalisation silently dropped records
      const dropped = rawJobs.length - normalisedJobs.length;
      if (dropped > 0) {
        logger.warn(
          `[Ingestion] normalisation dropped ${dropped} records from ${source}`,
        );
      }

      // ── 5. Upsert each job ──────────────────────────────────
      for (const job of normalisedJobs) {
        const outcome = await this.upsertJob(job);
        if (outcome === 'created') result.created++;
        if (outcome === 'skipped') result.skipped++;
        if (outcome === 'failed')  result.failed++;
      }

      // ── 6. Close log — SUCCESS ──────────────────────────────
      await prisma.scrapingLog.update({
        where: { id: log.id },
        data:  { status: ScrapingStatus.SUCCESS, jobsFound: result.created },
      });

      logger.info(
        `[Ingestion] run complete — source=${source} ` +
        `created=${result.created} skipped=${result.skipped} ` +
        `failed=${result.failed} dropped=${dropped}`,
      );
    } catch (err) {
      // ── 6. Close log — FAILED ───────────────────────────────
      let message: string;

      if (isSourceError(err)) {
        // Structured error from the source — log the full context
        message = `[${err.code}] ${err.message}`;
        logger.error(
          `[Ingestion] source error — source=${source} code=${err.code} ` +
          `retryable=${err.isRetryable} message="${err.message}"`,
          err.context,
        );
      } else {
        message = err instanceof Error ? err.message : String(err);
        logger.error(`[Ingestion] run failed — source=${source} error="${message}"`);
      }

      result.errors.push(message);

      await prisma.scrapingLog.update({
        where: { id: log.id },
        data:  { status: ScrapingStatus.FAILED, error: message },
      });
    }

    return result;
  }

  /**
   * Run ingestion across multiple sources sequentially.
   *
   * Sequential (not parallel) by default so we respect each source's
   * rate limit. Each source failure is isolated — others continue normally.
   *
   * Pass `{ concurrent: true }` to fan out in parallel when rate limits
   * are not a concern (e.g. mock sources in tests).
   */
  async runAll(
    userId: string,
    params: IngestionParams,
    sources: JobSource[],
    options: { concurrent?: boolean } = {},
  ): Promise<IngestionResult[]> {
    logger.info(
      `[Ingestion] runAll — sources=[${sources.join(', ')}] ` +
      `concurrent=${options.concurrent ?? false}`,
    );

    if (options.concurrent) {
      return Promise.all(sources.map((s) => this.run(userId, s, params)));
    }

    // Sequential — honour per-source rate limits
    const results: IngestionResult[] = [];
    for (const source of sources) {
      results.push(await this.run(userId, source, params));

      // Insert a cooldown between sources if the source specifies one
      const handler = this.tryGetHandler(source);
      const cooldown = handler?.capabilities.rateLimitMs ?? 0;
      if (cooldown > 0) {
        logger.debug(`[Ingestion] rate-limit cooldown ${cooldown}ms after ${source}`);
        await this.sleep(cooldown);
      }
    }

    return results;
  }

  /**
   * Convenience method — runs all currently *enabled* registered sources.
   * Skips sources where `capabilities.enabled` is false.
   */
  async runEnabled(
    userId: string,
    params: IngestionParams,
  ): Promise<IngestionResult[]> {
    const sources = getEnabledSources();
    logger.info(`[Ingestion] runEnabled — enabled sources=[${sources.join(', ')}]`);
    return this.runAll(userId, params, sources);
  }

  // ── Private helpers ──────────────────────────────────────────

  /**
   * Attempt to insert one normalised job.
   * - If a job with the same (source, externalId) already exists → skip
   * - P2002 unique constraint (race condition)                   → skip
   * - Any other DB error → mark failed (non-fatal, run continues)
   */
  private async upsertJob(
    job: NormalisedJob,
  ): Promise<'created' | 'skipped' | 'failed'> {
    try {
      if (job.externalId) {
        const existing = await prisma.job.findUnique({
          where: {
            source_externalId: { source: job.source, externalId: job.externalId },
          },
          select: { id: true },
        });

        if (existing) {
          logger.debug(
            `[Ingestion] skipped duplicate — source=${job.source} externalId=${job.externalId}`,
          );
          return 'skipped';
        }
      }

      await prisma.job.create({
        data: {
          title:       job.title,
          company:     job.company,
          location:    job.location,
          description: job.description,
          skills:      job.skills,
          source:      job.source,
          sourceUrl:   job.sourceUrl,
          externalId:  job.externalId ?? null,
          salary:      job.salary     ?? null,
          postedAt:    job.postedAt   ?? null,
        },
      });

      logger.debug(
        `[Ingestion] created job — "${job.title}" at ${job.company} (${job.source})`,
      );
      return 'created';
    } catch (err) {
      // P2002 = unique constraint violation (race condition fallback)
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        logger.debug(
          `[Ingestion] race-condition duplicate skipped — ${job.externalId}`,
        );
        return 'skipped';
      }

      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[Ingestion] failed to persist job "${job.title}": ${message}`);
      return 'failed';
    }
  }

  /** Safe registry lookup — returns undefined instead of throwing */
  private tryGetHandler(source: JobSource) {
    try {
      return getSource(source);
    } catch {
      return undefined;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const ingestionService = new IngestionService();
