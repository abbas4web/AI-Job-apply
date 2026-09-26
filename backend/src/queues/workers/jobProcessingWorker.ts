import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../utils/logger';
import { QUEUE_NAMES, QueueJobType } from '@ai-job-apply/shared';
import type { ProcessJobPayload, DeduplicateJobPayload } from '@ai-job-apply/shared';

// ─────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────

/**
 * PROCESS_JOB — validate and persist a raw inbound job record.
 *
 * Placeholder: real normalisation / enrichment logic goes here.
 * Throw UnrecoverableError for data that can never succeed on retry
 * (e.g. missing required fields) so BullMQ moves it straight to
 * the failed set without burning through retry attempts.
 */
async function handleProcessJob(job: Job<ProcessJobPayload>): Promise<void> {
  const { jobId, source } = job.data;

  if (!jobId || !source) {
    // Bad payload — retrying won't help
    throw new UnrecoverableError(
      `PROCESS_JOB missing required fields: jobId=${jobId}, source=${source}`,
    );
  }

  logger.info(`[job-processing] PROCESS_JOB start — jobId=${jobId} source=${source} attempt=${job.attemptsMade + 1}`);

  // TODO: call jobsService.create / enrich with external data here
  // e.g. await jobsService.create({ ...job.data.rawData, source, ... });

  logger.info(`[job-processing] PROCESS_JOB done  — jobId=${jobId}`);
}

/**
 * DEDUPLICATE_JOB — mark a job as a duplicate when externalId collision is detected.
 */
async function handleDeduplicateJob(job: Job<DeduplicateJobPayload>): Promise<void> {
  const { jobId, externalId, source } = job.data;

  if (!jobId || !externalId || !source) {
    throw new UnrecoverableError(
      `DEDUPLICATE_JOB missing required fields: jobId=${jobId}`,
    );
  }

  logger.info(`[job-processing] DEDUPLICATE_JOB start — jobId=${jobId} externalId=${externalId}`);

  // TODO: await jobsService.markDuplicate(jobId, true);

  logger.info(`[job-processing] DEDUPLICATE_JOB done  — jobId=${jobId}`);
}

// ─────────────────────────────────────────────────────────────
// Processor
// ─────────────────────────────────────────────────────────────

async function processJobProcessingJob(job: Job): Promise<void> {
  switch (job.name as QueueJobType) {
    case QueueJobType.PROCESS_JOB:
      return handleProcessJob(job as Job<ProcessJobPayload>);

    case QueueJobType.DEDUPLICATE_JOB:
      return handleDeduplicateJob(job as Job<DeduplicateJobPayload>);

    default:
      // Unknown job type — don't retry, surface immediately
      throw new UnrecoverableError(
        `[job-processing] Unknown job type: ${job.name}`,
      );
  }
}

// ─────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────

export function createJobProcessingWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.JOB_PROCESSING,
    processJobProcessingJob,
    {
      connection:  createRedisConnection('job-processing-worker'),
      concurrency: 5,
    },
  );

  // ── Lifecycle events ────────────────────────────────────────

  worker.on('active', (job) => {
    logger.info(
      `[job-processing] active — id=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`,
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      `[job-processing] completed — id=${job.id} name=${job.name}`,
    );
  });

  worker.on('failed', (job, err) => {
    const isUnrecoverable = err instanceof UnrecoverableError;
    const remaining = job ? (job.opts.attempts ?? 1) - job.attemptsMade : 0;

    logger.error(
      `[job-processing] failed — id=${job?.id} name=${job?.name} ` +
      `attempt=${job?.attemptsMade} remaining=${isUnrecoverable ? 0 : remaining} ` +
      `unrecoverable=${isUnrecoverable} error=${err.message}`,
    );
  });

  worker.on('error', (err) => {
    logger.error('[job-processing] worker error:', err.message);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`[job-processing] stalled — id=${jobId}`);
  });

  return worker;
}
