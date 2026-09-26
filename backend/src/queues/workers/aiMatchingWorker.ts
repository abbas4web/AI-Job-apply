import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../utils/logger';
import { QUEUE_NAMES, QueueJobType } from '@ai-job-apply/shared';
import type { MatchJobPayload } from '@ai-job-apply/shared';
import { aiService } from '../../services/ai.service';
import { AppError } from '../../utils/AppError';

// ─────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────

/**
 * MATCH_JOB — score a candidate's resume profile against a job via Gemini.
 *
 * - Uses matchJobForUser (resolves default resume) unless resumeId is supplied.
 * - 4xx AppErrors (bad request / not found) are unrecoverable — the payload
 *   is invalid and retrying will not help.
 * - 5xx / 502 (Gemini failures) are left recoverable so BullMQ retries
 *   with exponential back-off.
 */
async function handleMatchJob(job: Job<MatchJobPayload>): Promise<void> {
  const { userId, jobId, resumeId } = job.data;

  if (!userId || !jobId) {
    throw new UnrecoverableError(
      `MATCH_JOB missing required fields: userId=${userId}, jobId=${jobId}`,
    );
  }

  logger.info(
    `[ai-matching] MATCH_JOB start — userId=${userId} jobId=${jobId} ` +
    `resumeId=${resumeId ?? 'default'} attempt=${job.attemptsMade + 1}`,
  );

  try {
    const result = resumeId
      ? await aiService.matchJob(userId, resumeId, jobId)
      : await aiService.matchJobForUser(userId, jobId);

    logger.info(
      `[ai-matching] MATCH_JOB done — userId=${userId} jobId=${jobId} ` +
      `score=${result.matchScore} matched=${result.matchedSkills.length} ` +
      `missing=${result.missingSkills.length}`,
    );

    // TODO: persist result to DB or enqueue follow-up actions here
    // e.g. await matchResultsService.save({ userId, jobId, ...result });
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) {
      // 4xx — payload or data problem; retrying won't fix it
      throw new UnrecoverableError(
        `MATCH_JOB unrecoverable (${err.statusCode}): ${err.message}`,
      );
    }
    // Re-throw 5xx / network errors so BullMQ retries with backoff
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Processor
// ─────────────────────────────────────────────────────────────

async function processAiMatchingJob(job: Job): Promise<void> {
  switch (job.name as QueueJobType) {
    case QueueJobType.MATCH_JOB:
      return handleMatchJob(job as Job<MatchJobPayload>);

    default:
      throw new UnrecoverableError(
        `[ai-matching] Unknown job type: ${job.name}`,
      );
  }
}

// ─────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────

export function createAiMatchingWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.AI_MATCHING,
    processAiMatchingJob,
    {
      connection:  createRedisConnection('ai-matching-worker'),
      // Keep concurrency low — each job makes a Gemini API call
      concurrency: 2,
    },
  );

  // ── Lifecycle events ────────────────────────────────────────

  worker.on('active', (job) => {
    logger.info(
      `[ai-matching] active — id=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`,
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      `[ai-matching] completed — id=${job.id} name=${job.name}`,
    );
  });

  worker.on('failed', (job, err) => {
    const isUnrecoverable = err instanceof UnrecoverableError;
    const remaining = job ? (job.opts.attempts ?? 1) - job.attemptsMade : 0;

    logger.error(
      `[ai-matching] failed — id=${job?.id} name=${job?.name} ` +
      `attempt=${job?.attemptsMade} remaining=${isUnrecoverable ? 0 : remaining} ` +
      `unrecoverable=${isUnrecoverable} error=${err.message}`,
    );
  });

  worker.on('error', (err) => {
    logger.error('[ai-matching] worker error:', err.message);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`[ai-matching] stalled — id=${jobId}`);
  });

  return worker;
}
