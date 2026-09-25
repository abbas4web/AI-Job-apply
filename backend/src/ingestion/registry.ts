import { JobSource } from '@prisma/client';
import type { BaseJobSource } from './BaseJobSource';
import { MockJobSource } from './sources/MockJobSource';

// ─────────────────────────────────────────────────────────────
// Source registry — maps every JobSource enum value to the
// concrete class that handles it.
//
// To register a new source:
//   1. Import the class below
//   2. Add an entry to SOURCE_REGISTRY
//
// Sources that are not yet implemented are intentionally absent
// (requesting them will throw a clear error at runtime).
// ─────────────────────────────────────────────────────────────

type SourceRegistry = Partial<Record<JobSource, BaseJobSource>>;

const SOURCE_REGISTRY: SourceRegistry = {
  // ── Active sources ────────────────────────────────────────
  [JobSource.OTHER]: new MockJobSource(),

  // ── Placeholder stubs (not yet implemented) ───────────────
  // [JobSource.LINKEDIN]:     new LinkedInJobSource(),
  // [JobSource.INDEED]:       new IndeedJobSource(),
  // [JobSource.GLASSDOOR]:    new GlassdoorJobSource(),
  // [JobSource.COMPANY_SITE]: new CompanySiteJobSource(),
  // [JobSource.REFERRAL]:     new ReferralJobSource(),
};

/**
 * Retrieve the source handler for a given JobSource.
 * Throws a descriptive error when the source has no registered handler yet.
 */
export function getSource(source: JobSource): BaseJobSource {
  const handler = SOURCE_REGISTRY[source];

  if (!handler) {
    throw new Error(
      `No ingestion handler registered for source "${source}". ` +
      `Add the implementation to src/ingestion/sources/ and register it in src/ingestion/registry.ts.`
    );
  }

  return handler;
}

/** Returns every source that currently has a registered handler */
export function getRegisteredSources(): JobSource[] {
  return Object.keys(SOURCE_REGISTRY) as JobSource[];
}
