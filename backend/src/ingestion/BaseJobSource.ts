import type { JobSource } from '@prisma/client';
import { SourceError } from './errors';
import type {
  IJobSource,
  RawJob,
  NormalisedJob,
  IngestionParams,
  SourceCapabilities,
  HealthStatus,
} from './types';

// ─────────────────────────────────────────────────────────────
// BaseJobSource — default implementation of IJobSource.
//
// Concrete sources extend this class and must provide:
//   • `readonly source: JobSource`      — Prisma enum value
//   • `readonly capabilities`           — static descriptor
//   • `fetch(params): Promise<RawJob[]>`— data retrieval logic
//
// Everything else has a sensible default that subclasses may override.
//
// Quick-start:
//   1. Create src/ingestion/sources/<Name>JobSource.ts
//   2. `export class FooJobSource extends BaseJobSource { ... }`
//   3. Call `registerSource(new FooJobSource())` at the bottom of the file
//
// See HOW_TO_ADD_A_SOURCE.md for the complete integration guide.
// ─────────────────────────────────────────────────────────────
export abstract class BaseJobSource implements IJobSource {
  // ── Abstract members — must be provided by every subclass ──

  /** The Prisma JobSource enum value this class handles */
  abstract readonly source: JobSource;

  /**
   * Static descriptor advertised via GET /api/v1/ingestion/capabilities.
   * Set `enabled: false` when required credentials are absent.
   */
  abstract readonly capabilities: SourceCapabilities;

  /**
   * Fetch raw jobs from the source.
   *
   * Rules for implementors:
   *   - Handle pagination, auth, and per-page retries internally.
   *   - Respect `params.limit` as a soft ceiling (≤ capabilities.maxJobsPerRun).
   *   - Throw a `SourceError` for unrecoverable failures.
   *   - Do NOT throw for individual bad records — skip them and return the rest.
   */
  abstract fetch(params: IngestionParams): Promise<RawJob[]>;

  // ── IJobSource — default implementations ───────────────────

  /**
   * Validate that the source is ready to run.
   *
   * The default implementation checks `capabilities.enabled`. Subclasses that
   * require environment variables or API keys should override this method and
   * throw a `SourceError` with code `'CONFIG_INVALID'` when any required
   * config is missing.
   *
   * IngestionService calls this before `fetch()`. A thrown SourceError
   * marks the ScrapingLog as FAILED immediately without attempting a fetch.
   */
  validateConfig(): void {
    if (!this.capabilities.enabled) {
      throw new SourceError(
        'CONFIG_INVALID',
        this.source,
        `Source "${this.capabilities.displayName}" is disabled. ` +
        `Set capabilities.enabled = true and supply required credentials.`,
      );
    }
  }

  /**
   * Probe the source and return a health status.
   *
   * The base implementation returns `ok` immediately for disabled/mock sources
   * (no network required) and `degraded` for live sources that have not
   * overridden this method — signalling that a proper check is not implemented.
   *
   * Override this in real sources to make an inexpensive HEAD / ping call.
   */
  async healthCheck(): Promise<HealthStatus> {
    if (!this.capabilities.requiresNetwork) {
      return { status: 'ok', latencyMs: 0 };
    }

    // Live source without a real healthCheck override — report degraded
    return {
      status:    'degraded',
      latencyMs: 0,
      message:   `${this.capabilities.displayName} has no health-check implementation. Override healthCheck() in the source class.`,
    };
  }

  /**
   * Normalise a single RawJob into the canonical NormalisedJob shape.
   *
   * The default covers the common case. Override when a source needs:
   *   - HTML description stripping   → use this.stripHtml()
   *   - Salary normalisation         → parse before returning
   *   - Skills extraction from text  → run a regex over description
   */
  normalize(raw: RawJob): NormalisedJob {
    // Guard: every required field must be a non-empty string
    this.assertRequiredFields(raw);

    return {
      title:       this.cleanText(raw.title),
      company:     this.cleanText(raw.company),
      location:    this.cleanText(raw.location),
      description: this.cleanText(raw.description),
      source:      this.source,
      sourceUrl:   raw.sourceUrl.trim(),
      externalId:  raw.externalId?.trim() || undefined,
      skills:      this.cleanSkills(raw.skills),
      salary:      raw.salary?.trim() || undefined,
      postedAt:    raw.postedAt,
    };
  }

  /**
   * Normalise all raw jobs in one pass.
   * Called by IngestionService — not usually overridden.
   * Records that fail normalisation are logged and dropped (non-fatal).
   */
  normalizeAll(raws: RawJob[]): NormalisedJob[] {
    const results: NormalisedJob[] = [];

    for (const raw of raws) {
      try {
        results.push(this.normalize(raw));
      } catch (err) {
        // Individual normalisation failures are non-fatal — skip the record
        const msg = err instanceof Error ? err.message : String(err);
        // We can't import the logger here without a circular dep; console is fine
        // for this low-level utility. IngestionService will surface the aggregate count.
        console.warn(`[${this.source}] normalisation skipped: ${msg}`, { raw });
      }
    }

    return results;
  }

  // ── Protected helpers — available to subclasses ─────────────

  /** Strip leading/trailing whitespace and collapse internal whitespace */
  protected cleanText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  /**
   * Remove HTML tags and decode common entities.
   * Use this in `normalize()` for sources that return HTML descriptions.
   */
  protected stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')           // remove tags
      .replace(/&nbsp;/gi, ' ')           // decode &nbsp;
      .replace(/&amp;/gi, '&')            // decode &amp;
      .replace(/&lt;/gi, '<')             // decode &lt;
      .replace(/&gt;/gi, '>')             // decode &gt;
      .replace(/&quot;/gi, '"')           // decode &quot;
      .replace(/&#39;/gi, "'")            // decode &#39;
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Deduplicate, trim, and filter empty strings from a skills array.
   * Also enforces a maximum of 50 skills to prevent runaway data.
   */
  protected cleanSkills(skills?: string[]): string[] {
    if (!skills?.length) return [];

    const seen = new Set<string>();
    const result: string[] = [];

    for (const skill of skills) {
      const cleaned = skill.trim();
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        result.push(cleaned);
        if (result.length >= 50) break; // hard cap
      }
    }

    return result;
  }

  /** Clamp a number between min and max */
  protected clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Resolve the effective limit for a fetch call.
   * Applies the source's maxJobsPerRun ceiling on top of what the caller asked for.
   */
  protected resolveLimit(requested: number | undefined, defaultLimit = 20): number {
    const limit = requested ?? defaultLimit;
    return this.clamp(limit, 1, this.capabilities.maxJobsPerRun);
  }

  // ── Private helpers ─────────────────────────────────────────

  /**
   * Throw a descriptive error when a required RawJob field is missing or empty.
   * This prevents blank/corrupt records from reaching the DB.
   */
  private assertRequiredFields(raw: RawJob): void {
    const requiredStringFields: Array<keyof RawJob> = [
      'title',
      'company',
      'location',
      'description',
      'sourceUrl',
    ];

    for (const field of requiredStringFields) {
      const value = raw[field];
      if (typeof value !== 'string' || value.trim() === '') {
        throw new SourceError(
          'PARSE_ERROR',
          this.source,
          `RawJob is missing required field "${field}".`,
          { raw },
        );
      }
    }

    // sourceUrl must look like a URL
    if (!raw.sourceUrl.startsWith('http')) {
      throw new SourceError(
        'PARSE_ERROR',
        this.source,
        `RawJob.sourceUrl "${raw.sourceUrl}" does not look like an absolute URL.`,
        { raw },
      );
    }
  }
}
