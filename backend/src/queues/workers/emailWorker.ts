import { Worker, type Job, UnrecoverableError } from 'bullmq';
import { createRedisConnection } from '../../config/redis';
import { logger } from '../../utils/logger';
import { QUEUE_NAMES, QueueJobType } from '@ai-job-apply/shared';
import type {
  SendApplicationEmailPayload,
  SendMatchDigestPayload,
} from '@ai-job-apply/shared';

// ─────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────

/**
 * SEND_APPLICATION_EMAIL — transactional confirmation email sent to
 * the candidate after an application is submitted.
 *
 * TODO: integrate with an email provider (e.g. Resend, SendGrid).
 */
async function handleSendApplicationEmail(
  job: Job<SendApplicationEmailPayload>,
): Promise<void> {
  const { userId, applicationId, recipientEmail, jobTitle, company } = job.data;

  if (!userId || !applicationId || !recipientEmail) {
    throw new UnrecoverableError(
      `SEND_APPLICATION_EMAIL missing required fields: ` +
      `userId=${userId}, applicationId=${applicationId}, recipientEmail=${recipientEmail}`,
    );
  }

  logger.info(
    `[email-processing] SEND_APPLICATION_EMAIL start — ` +
    `applicationId=${applicationId} to=${recipientEmail} ` +
    `job="${jobTitle}" at "${company}" attempt=${job.attemptsMade + 1}`,
  );

  // TODO: await emailProvider.sendApplicationConfirmation({ recipientEmail, jobTitle, company });

  logger.info(
    `[email-processing] SEND_APPLICATION_EMAIL done — applicationId=${applicationId}`,
  );
}

/**
 * SEND_MATCH_DIGEST — periodic email summarising newly matched jobs
 * for the user.  Not triggered automatically yet.
 *
 * TODO: integrate with an email provider.
 */
async function handleSendMatchDigest(
  job: Job<SendMatchDigestPayload>,
): Promise<void> {
  const { userId, jobIds, periodEnd } = job.data;

  if (!userId || !jobIds?.length) {
    throw new UnrecoverableError(
      `SEND_MATCH_DIGEST missing required fields: userId=${userId}, jobIds=${jobIds?.length ?? 0}`,
    );
  }

  logger.info(
    `[email-processing] SEND_MATCH_DIGEST start — ` +
    `userId=${userId} jobs=${jobIds.length} periodEnd=${periodEnd} ` +
    `attempt=${job.attemptsMade + 1}`,
  );

  // TODO: await emailProvider.sendMatchDigest({ userId, jobIds, periodEnd });

  logger.info(
    `[email-processing] SEND_MATCH_DIGEST done — userId=${userId}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Processor
// ─────────────────────────────────────────────────────────────

async function processEmailJob(job: Job): Promise<void> {
  switch (job.name as QueueJobType) {
    case QueueJobType.SEND_APPLICATION_EMAIL:
      return handleSendApplicationEmail(job as Job<SendApplicationEmailPayload>);

    case QueueJobType.SEND_MATCH_DIGEST:
      return handleSendMatchDigest(job as Job<SendMatchDigestPayload>);

    default:
      throw new UnrecoverableError(
        `[email-processing] Unknown job type: ${job.name}`,
      );
  }
}

// ─────────────────────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────────────────────

export function createEmailWorker(): Worker {
  const worker = new Worker(
    QUEUE_NAMES.EMAIL_PROCESSING,
    processEmailJob,
    {
      connection:  createRedisConnection('email-worker'),
      concurrency: 3,
    },
  );

  // ── Lifecycle events ────────────────────────────────────────

  worker.on('active', (job) => {
    logger.info(
      `[email-processing] active — id=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}`,
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      `[email-processing] completed — id=${job.id} name=${job.name}`,
    );
  });

  worker.on('failed', (job, err) => {
    const isUnrecoverable = err instanceof UnrecoverableError;
    const remaining = job ? (job.opts.attempts ?? 1) - job.attemptsMade : 0;

    logger.error(
      `[email-processing] failed — id=${job?.id} name=${job?.name} ` +
      `attempt=${job?.attemptsMade} remaining=${isUnrecoverable ? 0 : remaining} ` +
      `unrecoverable=${isUnrecoverable} error=${err.message}`,
    );
  });

  worker.on('error', (err) => {
    logger.error('[email-processing] worker error:', err.message);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`[email-processing] stalled — id=${jobId}`);
  });

  return worker;
}
