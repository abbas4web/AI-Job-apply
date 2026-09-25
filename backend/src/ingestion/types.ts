import type { JobSource } from '@prisma/client';

// ─────────────────────────────────────────────────────────────
// RawJob — the un-normalised shape each source returns.
// Every field is optional except the ones that identify the job
// (title, company, sourceUrl, externalId) so sources only need
// to map what they actually have.
// ─────────────────────────────────────────────────────────────
export interface RawJob {
  /** Human-readable job title, e.g. "Senior Backend Engineer" */
  title: string;
  /** Company name, e.g. "Acme Corp" */
  company: string;
  /** Location string as the source reports it, e.g. "Remote", "Berlin, DE" */
  location: string;
  /** Full job description text */
  description: string;
  /** Canonical URL pointing to the original listing */
  sourceUrl: string;
  /**
   * Stable identifier assigned by the source.
   * Used as the deduplication key (source + externalId must be unique).
   * Provide a value whenever the source has a stable job ID.
   */
  externalId?: string;
  /** Skills / tags as reported by the source — free-form strings */
  skills?: string[];
  /** Salary string exactly as the source reports it (no normalisation) */
  salary?: string;
  /** When the job was originally posted */
  postedAt?: Date;
}

// ─────────────────────────────────────────────────────────────
// NormalisedJob — what the ingestion pipeline stores in the DB.
// Produced by BaseJobSource.normalize(); all required fields are
// guaranteed to be present and well-typed.
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
// IngestionParams — passed to IngestionService.run() / source.fetch()
// ─────────────────────────────────────────────────────────────
export interface IngestionParams {
  /** Free-text search query (job title, keywords) */
  query: string;
  /** Optional location filter */
  location?: string;
  /** Max number of jobs to fetch from this source in one run */
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
  failed:    number;   // jobs that failed to persist (non-fatal)
  errors:    string[]; // error messages for failed items
  logId:     string;   // ScrapingLog.id for this run
}
