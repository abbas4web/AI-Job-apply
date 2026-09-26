import { type JobsOptions } from 'bullmq';
import { aiMatchingQueue } from '../index';
import { matchResultsService } from '../../services/matchResults.service';
import { logger } from '../../utils/logger';
import { QueueJobType } from '@ai-job-apply/shared';
import type { MatchJobPayload } from '@ai-job-apply/shared';

// ─────────────────────────────────────────────────────────────
// enqueueMatchJob
//
// Adds a MATCH_JOB to the ai-matching queue and creates a
// PENDING row in job_match_results so the job's lifecycle is
// always visible in the DB from the moment it is queued.
//
// Deduplication:
//   BullMQ jobId is set to "<userId>:<jobId>:<resumeId>".
//   If the same triple is already WAITING or ACTIVE in the queue
//   BullMQ silently skips adding a duplicate — guaranteeing at-most-
//   one-active for any given (user, job, resume) combination.
//
// The DB upsert in markPending() makes re-enqueueing safe on
// retries too: the row is reset to PENDING without creating
// a second record.
// ─────────────────────────────────────────────────────────────

export interface EnqueueMatchJobOptions {
  userId:    string;
  jobId:     string;
  /** When omitted the worker resolves the user's default resume. */
  resumeId?: string;
  /** Override BullMQ job options (e.g. delay, priority). */
  jobOptions?: JobsOptions;
}

export async function enqueueMatchJob(
  opts: EnqueueMatchJobOptions,
): Promise<string> {
  const { userId, jobId, resumeId, jobOptions } = opts;

  // Build a stable, human-readable BullMQ job ID for deduplication.
  // resumeId may not be known yet (worker will resolve default) —
  // in that case use "default" as the discriminator.
  const dedupeId = `match:${userId}:${jobId}:${resumeId ?? 'default'}`;

  const payload: MatchJobPayload = { userId, jobId, resumeId };

  // Add to queue — BullMQ will skip if a job with this ID is
  // already WAITING or ACTIVE (natural dedup).
  const bullJob = await aiMatchingQueue.add(
    QueueJobType.MATCH_JOB,
    payload,
    {
      jobId:   dedupeId,
      ...jobOptions,
    },
  );

  const queueJobId = bullJob.id ?? dedupeId;

  // Mark PENDING in the DB (upsert — safe to call multiple times).
  // We use resumeId ?? '' here; the worker will overwrite with the
  // real resumeId once it resolves the default resume.
  if (resumeId) {
    await matchResultsService.markPending(userId, jobId, resumeId, queueJobId);
  }
  // If resumeId is unknown we defer the DB row creation to the worker,
  // which knows the resolved resumeId.

  logger.info(
    `[ai-matching-producer] enqueued MATCH_JOB — ` +
    `userId=${userId} jobId=${jobId} resumeId=${resumeId ?? 'default'} ` +
    `queueJobId=${queueJobId}`,
  );

  return queueJobId;
}
