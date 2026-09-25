import type { JobSource } from '@prisma/client';
import type { RawJob, NormalisedJob, IngestionParams } from './types';

// ─────────────────────────────────────────────────────────────
// BaseJobSource — contract every job source must implement.
//
// To add a new source:
//   1. Create a class in src/ingestion/sources/ that extends BaseJobSource
//   2. Set the static `source` property to the matching JobSource enum value
//   3. Implement fetch() to return RawJob[]
//   4. Optionally override normalize() for source-specific transformations
//   5. Register the class in src/ingestion/registry.ts
// ─────────────────────────────────────────────────────────────

export abstract class BaseJobSource {
  /** The JobSource enum value this class handles — set in each subclass */
  abstract readonly source: JobSource;

  /**
   * Fetch raw jobs from the source.
   * Implementations should handle pagination, rate-limiting, and
   * source-specific auth internally. Any unrecoverable error should
   * throw so IngestionService can mark the ScrapingLog as FAILED.
   */
  abstract fetch(params: IngestionParams): Promise<RawJob[]>;

  /**
   * Normalise a single RawJob into the canonical NormalisedJob shape.
   * The default implementation covers the common case; override when
   * a source needs bespoke cleaning (e.g. HTML-stripping, salary parsing).
   */
  normalize(raw: RawJob): NormalisedJob {
    return {
      title:       this.cleanText(raw.title),
      company:     this.cleanText(raw.company),
      location:    this.cleanText(raw.location),
      description: this.cleanText(raw.description),
      source:      this.source,
      sourceUrl:   raw.sourceUrl.trim(),
      externalId:  raw.externalId?.trim(),
      skills:      (raw.skills ?? []).map((s) => s.trim()).filter(Boolean),
      salary:      raw.salary?.trim() || undefined,
      postedAt:    raw.postedAt,
    };
  }

  /**
   * Normalise all raw jobs in one pass.
   * Called by IngestionService — not usually overridden.
   */
  normalizeAll(raws: RawJob[]): NormalisedJob[] {
    return raws.map((r) => this.normalize(r));
  }

  // ── Helpers available to subclasses ──────────────────────────

  /** Strip leading/trailing whitespace and collapse internal whitespace */
  protected cleanText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  /** Remove HTML tags — useful for sources that return HTML descriptions */
  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Clamp a number between min and max */
  protected clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
