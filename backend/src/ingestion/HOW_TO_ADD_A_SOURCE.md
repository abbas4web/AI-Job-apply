# How to Add a New Job Source

This guide explains how to wire a new job board or data feed into the ingestion pipeline. The architecture is a plugin system: adding a source requires **no changes** to `IngestionService`, `registry.ts`, the controller, or the routes.

---

## Overview

The ingestion pipeline has four layers:

```
HTTP Request
    │
    ▼
IngestionService.run()          ← orchestrator (do not modify)
    │
    ▼
IJobSource.fetch()              ← your implementation lives here
    │
    ▼
IJobSource.normalizeAll()       ← BaseJobSource handles this
    │
    ▼
Prisma job.create()             ← persistence (do not modify)
```

Every source is an independent class that extends `BaseJobSource` and self-registers when its file is imported. The orchestrator never needs to know the source exists ahead of time.

---

## Step-by-step

### 1. Check the Prisma enum

Open `prisma/schema.prisma` and confirm your source has a value in the `JobSource` enum:

```prisma
enum JobSource {
  LINKEDIN
  INDEED
  GLASSDOOR
  COMPANY_SITE
  REFERRAL
  OTHER
}
```

If you need a new value, add it to the enum and run:

```bash
npx prisma migrate dev --name add_<source_name>_job_source
```

---

### 2. Create the source file

Create `src/ingestion/sources/<Name>JobSource.ts`. Use this template:

```typescript
import { JobSource } from '@prisma/client';
import { BaseJobSource } from '../BaseJobSource';
import { SourceError } from '../errors';
import { registerSource } from '../registry';
import type {
  RawJob,
  IngestionParams,
  SourceCapabilities,
  HealthStatus,
} from '../types';

export class LinkedInJobSource extends BaseJobSource {
  // ── 1. Declare which enum value this class handles ──────────
  readonly source = JobSource.LINKEDIN;

  // ── 2. Describe the source's capabilities ───────────────────
  //    These values are surfaced by GET /api/v1/ingestion/capabilities
  //    and used by IngestionService to clamp limits and apply cooldowns.
  readonly capabilities: SourceCapabilities = {
    displayName:      'LinkedIn Jobs',
    description:      'Fetches job listings from the LinkedIn Jobs API.',
    enabled:          Boolean(process.env.LINKEDIN_API_KEY),   // false until key is set
    requiresNetwork:  true,
    rateLimitMs:      5_000,   // 5 s between consecutive runs
    maxJobsPerRun:    50,
    supportsLocation: true,
    supportsQuery:    true,
  };

  // ── 3. Validate configuration before the run starts ─────────
  //    BaseJobSource.validateConfig() already checks capabilities.enabled.
  //    Override here to add credential-level checks.
  validateConfig(): void {
    super.validateConfig();   // enforces enabled: true

    if (!process.env.LINKEDIN_API_KEY) {
      throw new SourceError(
        'CONFIG_INVALID',
        this.source,
        'LINKEDIN_API_KEY environment variable is not set.',
      );
    }
  }

  // ── 4. Implement fetch() ─────────────────────────────────────
  //    Return raw jobs. Throw a SourceError for unrecoverable failures.
  //    Do NOT throw for individual bad records — skip them silently.
  async fetch(params: IngestionParams): Promise<RawJob[]> {
    const limit = this.resolveLimit(params.limit);  // respects maxJobsPerRun

    // Replace with your real HTTP call:
    const response = await fetch(
      `https://api.linkedin.com/v2/jobSearch?keywords=${encodeURIComponent(params.query)}&count=${limit}`,
      { headers: { Authorization: `Bearer ${process.env.LINKEDIN_API_KEY}` } },
    );

    if (response.status === 429) {
      throw new SourceError('RATE_LIMITED', this.source, 'LinkedIn rate limit hit.');
    }
    if (!response.ok) {
      throw new SourceError(
        'HTTP_ERROR',
        this.source,
        `LinkedIn returned HTTP ${response.status}.`,
        { status: response.status },
      );
    }

    const data = await response.json() as { elements: unknown[] };

    // Map the API shape to RawJob. Skip records that are missing required fields.
    const jobs: RawJob[] = [];
    for (const item of data.elements) {
      try {
        jobs.push(this.mapToRawJob(item));
      } catch {
        // Individual mapping failures are non-fatal
      }
    }

    return jobs;
  }

  // ── 5. (Optional) Override normalize() ──────────────────────
  //    Only needed if the source returns HTML descriptions, nested salary
  //    objects, or other shapes that the default normaliser can't handle.
  //
  // normalize(raw: RawJob): NormalisedJob {
  //   return {
  //     ...super.normalize(raw),
  //     description: this.stripHtml(raw.description),
  //   };
  // }

  // ── 6. (Optional) Override healthCheck() ────────────────────
  //    Probe the endpoint cheaply (e.g. HEAD request).
  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const res = await fetch('https://api.linkedin.com/v2/jobSearch?count=1', {
        method:  'HEAD',
        headers: { Authorization: `Bearer ${process.env.LINKEDIN_API_KEY}` },
      });
      const latencyMs = Date.now() - start;
      if (res.ok || res.status === 401) {
        // 401 means the endpoint is reachable but the key may be wrong
        return { status: 'ok', latencyMs };
      }
      return { status: 'degraded', latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      return {
        status:  'down',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── Private helpers ──────────────────────────────────────────

  private mapToRawJob(item: unknown): RawJob {
    // Narrow `item` to the shape your API actually returns, then map fields.
    // Throw (not SourceError) if a required field is missing — normalizeAll()
    // will catch it and skip the record without failing the whole run.
    const i = item as Record<string, unknown>;
    return {
      externalId:  String(i['entityUrn']),
      title:       String(i['title']),
      company:     String((i['company'] as Record<string, unknown>)['name']),
      location:    String(i['formattedLocation']),
      description: String(i['description']),
      sourceUrl:   `https://www.linkedin.com/jobs/view/${i['entityUrn']}`,
      skills:      Array.isArray(i['skills']) ? (i['skills'] as string[]) : [],
      postedAt:    i['listedAt'] ? new Date(i['listedAt'] as number) : undefined,
    };
  }
}

// ── Self-registration (side-effect) ─────────────────────────
// Importing this file is all it takes to activate the source.
registerSource(new LinkedInJobSource());
```

---

### 3. Register the import in the sources barrel

Open `src/ingestion/sources/index.ts` and add one line:

```typescript
export * from './LinkedInJobSource';
```

`IngestionService` imports `sources/index.ts` at startup, which triggers the `registerSource()` call. Nothing else needs to change.

---

### 4. Add environment variables

Add the required keys to `.env` (and `.env.example` with placeholder values):

```dotenv
# .env
LINKEDIN_API_KEY=your_key_here

# .env.example
LINKEDIN_API_KEY=
```

When the variable is absent, `capabilities.enabled` evaluates to `false`, `validateConfig()` throws, and `IngestionService` skips the source with a warning log — the rest of the run continues normally.

---

### 5. Verify it appears in the API

Start the server and call the discovery endpoints:

```bash
# All registered sources (enabled and disabled)
GET /api/v1/ingestion/sources

# Full capabilities descriptor for every source
GET /api/v1/ingestion/capabilities

# Live readiness probe
GET /api/v1/ingestion/health
GET /api/v1/ingestion/health/LINKEDIN
```

---

## Reference: IJobSource contract

| Member | Required | Description |
|---|---|---|
| `source` | ✅ | `JobSource` enum value this class handles |
| `capabilities` | ✅ | Static descriptor (see below) |
| `fetch(params)` | ✅ | Returns `RawJob[]`. Throws `SourceError` on unrecoverable failure |
| `normalize(raw)` | Default | Converts one `RawJob` → `NormalisedJob`. Override for HTML/custom shapes |
| `normalizeAll(raws)` | Default | Batch normalise with per-record error isolation. Rarely overridden |
| `validateConfig()` | Default | Checks `enabled` flag + any credentials. Throws `SourceError('CONFIG_INVALID')` |
| `healthCheck()` | Default | Returns `HealthStatus`. Override to probe the live endpoint |

---

## Reference: SourceCapabilities fields

| Field | Type | Description |
|---|---|---|
| `displayName` | `string` | Human-readable name shown in the UI |
| `description` | `string` | One-sentence summary |
| `enabled` | `boolean` | `false` → source is skipped silently |
| `requiresNetwork` | `boolean` | `false` for mock/offline sources |
| `rateLimitMs` | `number` | Minimum ms between consecutive runs (0 = no limit) |
| `maxJobsPerRun` | `number` | Hard ceiling on jobs fetched per run; use `this.resolveLimit()` |
| `supportsLocation` | `boolean` | Whether `params.location` has any effect |
| `supportsQuery` | `boolean` | Whether `params.query` filters results |

---

## Reference: SourceError codes

| Code | When to use |
|---|---|
| `CONFIG_INVALID` | Missing or malformed env vars / API keys |
| `HTTP_ERROR` | Non-2xx HTTP response from the source |
| `PARSE_ERROR` | Response received but could not be parsed |
| `RATE_LIMITED` | HTTP 429 or explicit back-off signal |
| `NETWORK_ERROR` | DNS failure, timeout, connection refused |
| `AUTH_FAILED` | Credentials explicitly rejected by the source |
| `EMPTY_RESPONSE` | Response valid but contained zero usable jobs |
| `UNKNOWN` | Anything else |

`RATE_LIMITED` and `NETWORK_ERROR` set `isRetryable: true` automatically.

---

## Reference: Protected helpers in BaseJobSource

These are available inside any subclass without importing anything extra:

| Helper | Signature | Description |
|---|---|---|
| `cleanText` | `(value: string) => string` | Trim + collapse internal whitespace |
| `stripHtml` | `(html: string) => string` | Remove tags and decode common entities |
| `cleanSkills` | `(skills?: string[]) => string[]` | Deduplicate, trim, cap at 50 |
| `clamp` | `(value, min, max) => number` | Numeric range clamp |
| `resolveLimit` | `(requested?, default?) => number` | Applies `maxJobsPerRun` ceiling |

---

## Checklist

```
[ ] JobSource enum value exists in prisma/schema.prisma (migrate if new)
[ ] Class created in src/ingestion/sources/<Name>JobSource.ts
[ ] source, capabilities, and fetch() implemented
[ ] validateConfig() throws SourceError('CONFIG_INVALID') when creds are missing
[ ] healthCheck() overridden for live sources
[ ] registerSource(new MySource()) called at bottom of the file
[ ] Import added to src/ingestion/sources/index.ts
[ ] Env vars documented in .env.example
[ ] GET /api/v1/ingestion/capabilities shows the new source
[ ] GET /api/v1/ingestion/health/:SOURCE returns ok or degraded (not down)
```
