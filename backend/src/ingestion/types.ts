import type { JobSource } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// RawJob — the un-normalised shape each source returns.
//
// Required fields are the ones the pipeline must have to persist
// a job. Optional fields are mapped if the source provides them.
// ─────────────────────────────────────────────────────────────
export interface RawJob {
  /** Human-readable job title, e.g. "Senior Backend Engineer" */
  title: string;
  /** Company name, e.g. "Acme Corp" */
  company: string;
  /** Location string as the source reports it, e.g. "Remote", "Berlin, DE" */
  location: string;
  /** Full job description text — may be HTML; BaseJobSource.normalize() will clean it */
  description: string;
  /** Canonical URL pointing to the original listing */
  sourceUrl: string;
  /**
   * Stable identifier assigned by the source.
   * Used as the deduplication key: (source + externalId) must be unique in the DB.
   * Provide this whenever the source has a stable job ID.
   */
  externalId?: string;
  /** Skills / tags as reported by the source — free-form strings */
  skills?: string[];
  /** Salary string exactly as the source reports it (no normalisation expected) */
  salary?: string;
  /** When the job was originally posted */
  postedAt?: Date;
}

// ─────────────────────────────────────────────────────────────
// NormalisedJob — what the ingestion pipeline writes to the DB.
//
// Produced by IJobSource.normalize(). All required fields are
// guaranteed to be present, non-empty, and well-typed by the
// time this shape reaches IngestionService.
// ─────────────────────────────────────────────────────────────
export interface NormalisedJob {
  title:       string;
  company:     string;
  location:    string;
  description: string;
  source:      JobSource;
  sourceUrl:   string;
  externalId?: string;
  skills:      string[];
  salary?:     string;
  postedAt?:   Date;
}

// ─────────────────────────────────────────────────────────────
// IngestionParams — passed into IngestionService.run() and
// forwarded to each source's fetch() call.
// ─────────────────────────────────────────────────────────────
export interface IngestionParams {
  /** Free-text search query (job title, keywords) */
  query: string;
  /** Optional location filter */
  location?: string;
  /** Max number of jobs to fetch from this source in one run (default 20) */
  limit?: number;
}

// ─────────────────────────────────────────────────────────────
// IngestionResult — returned by IngestionService.run()
// ─────────────────────────────────────────────────────────────
export interface IngestionResult {
  source:    JobSource;
  fetched:   number;   // raw jobs returned by the source
  created:   number;   // new jobs written to the DB
  skipped:   number;   // duplicates ignored
  failed:    number;   // jobs that failed to persist (non-fatal per-item)
  errors:    string[]; // error messages for failed items
  logId:     string;   // ScrapingLog.id for this run
}

// ─────────────────────────────────────────────────────────────
// SourceCapabilities — static descriptor that every IJobSource
// must expose. The registry and controller surface this to callers
// so they can make informed decisions (e.g. UI can show which
// sources are available, scheduler can respect rate limits).
// ─────────────────────────────────────────────────────────────
export interface SourceCapabilities {
  /**
   * Human-readable display name, e.g. "LinkedIn Jobs".
   * Shown in the UI and admin dashboards.
   */
  displayName: string;

  /**
   * One-sentence description of what the source provides.
   * Shown in /ingestion/capabilities.
   */
  description: string;

  /**
   * Whether this source is safe to call in the current environment.
   * Set to false for sources that are stubbed or depend on unset credentials.
   * IngestionService will skip disabled sources rather than failing.
   */
  enabled: boolean;

  /**
   * True when the source requires a network call.
   * MockJobSource sets this to false. Useful for CI environments that
   * want to skip all live sources.
   */
  requiresNetwork: boolean;

  /**
   * Cooldown between consecutive runs in milliseconds.
   * The scheduler uses this to avoid hammering the source.
   * 0 means no cooldown (e.g. mock sources).
   */
  rateLimitMs: number;

  /**
   * Hard upper bound on how many jobs this source can return per run.
   * Used by IngestionService to clamp the caller-supplied `limit`.
   */
  maxJobsPerRun: number;

  /**
   * Whether this source supports location-based filtering.
   * If false, the `location` param in IngestionParams is silently ignored.
   */
  supportsLocation: boolean;

  /**
   * Whether this source supports keyword/query filtering.
   * If false, all available jobs are returned regardless of `query`.
   */
  supportsQuery: boolean;
}

// ─────────────────────────────────────────────────────────────
// HealthStatus — result of IJobSource.healthCheck()
// ─────────────────────────────────────────────────────────────
export type HealthStatus =
  | { status: 'ok';      latencyMs: number }
  | { status: 'degraded'; latencyMs: number; message: string }
  | { status: 'down';     message: string };

// ─────────────────────────────────────────────────────────────
// IJobSource — the formal plugin contract.
//
// Every job source in the application implements this interface.
// BaseJobSource provides default implementations for most methods;
// concrete sources only need to implement `source`, `capabilities`,
// and `fetch()`.
//
// Quick-start checklist for implementors:
//   1. Create a class in src/ingestion/sources/<Name>JobSource.ts
//   2. Extend BaseJobSource (it implements IJobSource)
//   3. Set `readonly source = JobSource.<VALUE>`
//   4. Provide a `readonly capabilities` object
//   5. Implement `fetch(params)`
//   6. Optionally override `normalize()` for bespoke cleaning
//   7. Call `registerSource(new MySource())` at the bottom of the file
//
// See HOW_TO_ADD_A_SOURCE.md for the full integration guide.
// ─────────────────────────────────────────────────────────────
export interface IJobSource {
  /** The JobSource enum value this implementation handles */
  readonly source: JobSource;

  /** Static descriptor advertised to callers */
  readonly capabilities: SourceCapabilities;

  /**
   * Fetch raw jobs from the source.
   *
   * Implementations handle pagination, auth, and retries internally.
   * Throw a `SourceError` for unrecoverable failures so IngestionService
   * can mark the ScrapingLog as FAILED with a clear message.
   * Per-item failures should be caught internally and returned as best-effort
   * partial results rather than thrown.
   */
  fetch(params: IngestionParams): Promise<RawJob[]>;

  /**
   * Normalise a single RawJob into the canonical NormalisedJob shape.
   * The default implementation in BaseJobSource handles the common case.
   * Override when a source needs HTML-stripping, salary parsing, etc.
   */
  normalize(raw: RawJob): NormalisedJob;

  /**
   * Normalise an entire batch of raw jobs.
   * Called by IngestionService; typically not overridden.
   */
  normalizeAll(raws: RawJob[]): NormalisedJob[];

  /**
   * Validate that the source is correctly configured before a run starts.
   * Throws a `SourceError` if required environment variables are missing
   * or the configuration is invalid. Called by IngestionService before fetch().
   */
  validateConfig(): void;

  /**
   * Probe the source endpoint and return a health status.
   * Used by GET /api/v1/ingestion/health to surface live readiness.
   * Must not throw — return `{ status: 'down' }` on failure instead.
   */
  healthCheck(): Promise<HealthStatus>;
}
