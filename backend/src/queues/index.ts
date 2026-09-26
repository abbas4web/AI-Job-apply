import { Queue, type DefaultJobOptions } from 'bullmq';
import { redis } from '../config/redis';
import { QUEUE_NAMES } from '@ai-job-apply/shared';

// ─────────────────────────────────────────────────────────────
// Default job options — applied to every job unless overridden
// at the enqueue call-site.
//
// Retry policy:  3 attempts total (1 original + 2 retries)
// Back-off:      exponential starting at 2 s  → 2 s, 4 s, 8 s …
// Retention:     keep last 200 completed, 100 failed in Redis
//                (avoids unbounded memory growth)
// ─────────────────────────────────────────────────────────────

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type:  'exponential',
    delay: 2_000,   // first retry after 2 s, second after 4 s
  },
  removeOnComplete: { count: 200 },
  removeOnFail:     { count: 100 },
};

// ── Shared producer connection ────────────────────────────────
// All Queue instances (producers) share the single `redis` client
// from config/redis — they use non-blocking commands so sharing
// is safe.  Workers get their own connections via createRedisConnection().

const connection = redis;

// ── Queue instances ───────────────────────────────────────────

/** Normalises, deduplicates, and persists inbound job listings. */
export const jobProcessingQueue = new Queue(QUEUE_NAMES.JOB_PROCESSING, {
  connection,
  defaultJobOptions,
});

/** Scores a candidate's resume profile against a specific job via Gemini. */
export const aiMatchingQueue = new Queue(QUEUE_NAMES.AI_MATCHING, {
  connection,
  defaultJobOptions,
});

/** Sends transactional and digest emails (application confirmations, match digests). */
export const emailProcessingQueue = new Queue(QUEUE_NAMES.EMAIL_PROCESSING, {
  connection,
  defaultJobOptions,
});

// ── Legacy queues (kept for backwards-compat with existing code) ──

/** @deprecated Use jobProcessingQueue / aiMatchingQueue instead */
export const aiTasksQueue = new Queue(QUEUE_NAMES.AI_TASKS, {
  connection,
  defaultJobOptions,
});

/** @deprecated Automatic scraping not yet enabled */
export const scrapingQueue = new Queue(QUEUE_NAMES.SCRAPING, {
  connection,
  defaultJobOptions,
});

/** @deprecated Use emailProcessingQueue instead */
export const applicationsQueue = new Queue(QUEUE_NAMES.APPLICATIONS, {
  connection,
  defaultJobOptions,
});
