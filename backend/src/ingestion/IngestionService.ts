import { JobSource, ScrapingStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { getSource } from './registry';
import type { IngestionParams, IngestionResult, NormalisedJob } from './types';

// ─────────────────────────────────────────────────────────────
// IngestionService — orchestrates one ingestion run:
//
//   1. Open a ScrapingLog row (status = STARTED)
//   2. Delegate fetching to the registered source handler
//   3. Normalise every RawJob via BaseJobSource.normalizeAll()
//   4. Upsert each job into the DB (skip duplicates gracefully)
//   5. Close the ScrapingLog row (status = SUCCESS | FAILED)
//   6. Return an IngestionResult summary
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
    // ── 1. Open scraping log ────────────────────────────────
    const log = await prisma.scrapingLog.create({
      data: {
        userId,
        source,
        query:    params.query,
        location: params.location ?? null,
        status:   ScrapingStatus.STARTED,
      },
    });

    logger.info(`[Ingestion] run started — source=${source} query="${params.query}" logId=${log.id}`);

    const result: IngestionResult = {
      source,
      fetched:  0,
      created:  0,
      skipped:  0,
      failed:   0,
      errors:   [],
      logId:    log.id,
    };

    try {
      // ── 2. Fetch raw jobs ─────────────────────────────────
      const sourceHandler = getSource(source);
      const rawJobs       = await sourceHandler.fetch(params);
      result.fetched      = rawJobs.length;

      logger.info(`[Ingestion] fetched ${rawJobs.length} raw jobs from ${source}`);

      // ── 3. Normalise ──────────────────────────────────────
      const normalisedJobs = sourceHandler.normalizeAll(rawJobs);

      // ── 4. Upsert each job ────────────────────────────────
      for (const job of normalisedJobs) {
        const outcome = await this.upsertJob(job);
        if (outcome === 'created')   result.created++;
        if (outcome === 'skipped')   result.skipped++;
        if (outcome === 'failed')    result.failed++;
      }

      // ── 5. Close log — SUCCESS ────────────────────────────
      await prisma.scrapingLog.update({
        where: { id: log.id },
        data:  { status: ScrapingStatus.SUCCESS, jobsFound: result.created },
      });

      logger.info(
        `[Ingestion] run complete — source=${source} ` +
        `created=${result.created} skipped=${result.skipped} failed=${result.failed}`,
      );
    } catch (err) {
      // ── 5. Close log — FAILED ─────────────────────────────
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(message);

      await prisma.scrapingLog.update({
        where: { id: log.id },
        data:  { status: ScrapingStatus.FAILED, error: message },
      });

      logger.error(`[Ingestion] run failed — source=${source} error="${message}"`);
    }

    return result;
  }

  /**
   * Run ingestion across every registered source in parallel.
   * Each source failure is isolated — others continue normally.
   */
  async runAll(
    userId: string,
    params: IngestionParams,
    sources: JobSource[],
  ): Promise<IngestionResult[]> {
    logger.info(`[Ingestion] runAll — sources=[${sources.join(', ')}]`);

    return Promise.all(
      sources.map((source) => this.run(userId, source, params)),
    );
  }

  // ── Private helpers ─────────────────────────────────────────

  /**
   * Attempt to insert one normalised job.
   * - If a job with the same (source, externalId) already exists → skip
   * - On any other DB error → mark failed (non-fatal, run continues)
   */
  private async upsertJob(
    job: NormalisedJob,
  ): Promise<'created' | 'skipped' | 'failed'> {
    try {
      if (job.externalId) {
        // Check for existing job — if found, skip silently
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
        logger.debug(`[Ingestion] race-condition duplicate skipped — ${job.externalId}`);
        return 'skipped';
      }

      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[Ingestion] failed to persist job "${job.title}": ${message}`);
      return 'failed';
    }
  }
}

export const ingestionService = new IngestionService();
