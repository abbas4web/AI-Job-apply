import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../utils/logger';
import { QUEUE_NAMES, QueueJobType } from '@ai-job-apply/shared';
import type { MatchJobPayload } from '@ai-job-apply/shared';
import { aiService } from '../../services/ai.service';
import { matchResultsService } from '../../services/matchResults.service';
import { AppError } from '../../utils/AppError';
import { sseService } from '../../sse/SseService';

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────

/**
 * handleMatchJob — full pipeline for a single MATCH_JOB:
 *
 *   1. Flip DB row → PROCESSING  (idempotent upsert)
 *   2. Call Gemini via aiService  (retries handled by BullMQ backoff)
 *   3. Persist result             (idempotent upsert → COMPLETED)
 *
 * Retry safety:
 *   - Every DB write uses upsert on unique(userId, jobId, resumeId).
 *   - A crash between steps 2 and 3 will re-run step 2 on the next
 *     attempt; Gemini is called again and the result is overwritten —
 *     no duplicate rows are ever created.
 *
 * Unrecoverable errors (4xx / bad payload):
 *   - DB row is flipped to FAILED immediately.
 *   - UnrecoverableError tells BullMQ not to retry.
 *
 * Recoverable errors (5xx / network):
 *   - Re-thrown so BullMQ retries with exponential back-off.
 *   - DB row stays PROCESSING until the final attempt; the `failed`
 *     event handler (below) flips it to FAILED after exhaustion.
 */
async function handleMatchJob(job: Job<MatchJobPayload>): Promise<void> {
  const { userId, jobId, resumeId: payloadResumeId } = job.data;
  const queueJobId = job.id ?? `match:${userId}:${jobId}`;

  if (!userId || !jobId) {
    throw new UnrecoverableError(
      `MATCH_JOB missing required fields: userId=${userId}, jobId=${jobId}`,
    );
  }

  logger.info(
    `[ai-matching] MATCH_JOB start — userId=${userId} jobId=${jobId} ` +
    `resumeId=${payloadResumeId ?? 'default'} attempt=${job.attemptsMade + 1}`,
  );

  // ── Step 1: mark PROCESSING ───────────────────────────────
  // resumeId may still be unknown (worker will resolve default resume).
  // We only update the row if we have the full key; otherwise the
  // upsert in saveResult / markFailed will create it on first write.
  if (payloadResumeId) {
    await matchResultsService.markProcessing(userId, jobId, payloadResumeId);
  }

  // ── Step 2: call Gemini ───────────────────────────────────
  let resolvedResumeId: string;

  try {
    const { resumeId: r, match } = payloadResumeId
      ? {
          resumeId: payloadResumeId,
          match:    await aiService.matchJob(userId, payloadResumeId, jobId),
        }
      : await aiService.matchJobForUser(userId, jobId);

    resolvedResumeId = r;

    // ── Step 3: persist result (COMPLETED) ───────────────────
    await matchResultsService.saveResult(
      userId,
      jobId,
      resolvedResumeId,
      match,
      queueJobId,
    );

    logger.info(
      `[ai-matching] MATCH_JOB done — userId=${userId} jobId=${jobId} ` +
      `resumeId=${resolvedResumeId} score=${match.matchScore}`,
    );

    // ── SSE: notify the user ──────────────────────────────────
    sseService.emit(userId, 'job.matched', {
      jobId,
      resumeId: resolvedResumeId,
      matchScore: match.matchScore,
    });
    sseService.emit(userId, 'ai.matching.completed', {
      jobId,
      resumeId: resolvedResumeId,
      matchScore: match.matchScore,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
    });
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) {
      // Bad payload / missing data — retrying will not help
      const msg = `MATCH_JOB unrecoverable (${err.statusCode}): ${err.message}`;

      // Persist failure to DB if we have enough key parts
      if (payloadResumeId) {
        await matchResultsService.markFailed(userId, jobId, payloadResumeId, msg);
      }

      throw new UnrecoverableError(msg);
    }

    // 5xx / network — re-throw for BullMQ retry with backoff
    // Emit automation error SSE so the user sees it in real time
    sseService.emit(userId, 'automation.error', {
      jobId,
      message: err instanceof Error ? err.message : String(err),
    });
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
      // Low concurrency — each job makes a Gemini API call
      concurrency: 2,
    },
  );

  // ── Lifecycle events ────────────────────────────────────────

  worker.on('active', (job) => {
    logger.info(
      `[ai-matching] active — id=${job.id} name=${job.name} ` +
      `attempt=${job.attemptsMade + 1}`,
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      `[ai-matching] completed — id=${job.id} name=${job.name}`,
    );
  });

  /**
   * failed — fires after ALL retries are exhausted (or on
   * UnrecoverableError).  Flips the DB row to FAILED so the
   * outcome is always visible regardless of how the job died.
   */
  worker.on('failed', (job, err) => {
    const isUnrecoverable = err instanceof UnrecoverableError;
    const remaining = job
      ? Math.max(0, (job.opts.attempts ?? 1) - job.attemptsMade - 1)
      : 0;

    logger.error(
      `[ai-matching] failed — id=${job?.id} name=${job?.name} ` +
      `attempt=${job?.attemptsMade} remaining=${remaining} ` +
      `unrecoverable=${isUnrecoverable} error=${err.message}`,
    );

    // Only flip to FAILED once all retries are exhausted
    if (remaining === 0 && job?.data) {
      const { userId, jobId, resumeId } = job.data as MatchJobPayload;
      if (userId && jobId && resumeId) {
        matchResultsService
          .markFailed(userId, jobId, resumeId, err.message)
          .catch((dbErr: unknown) => {
            logger.error(
              `[ai-matching] could not markFailed in DB — id=${job.id}:`,
              String(dbErr),
            );
          });

        // SSE: notify the user that matching failed
        sseService.emit(userId, 'ai.matching.failed', {
          jobId,
          resumeId,
          message: err.message,
        });
      }
    }
  });

  worker.on('error', (err) => {
    logger.error('[ai-matching] worker error:', err.message);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`[ai-matching] stalled — id=${jobId}`);
  });

  return worker;
}
