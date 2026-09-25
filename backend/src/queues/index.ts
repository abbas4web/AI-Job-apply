import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { QUEUE_NAMES } from '@ai-job-apply/shared';

const connection = redis;

// ── Queue instances ───────────────────────────────────────────
export const aiTasksQueue = new Queue(QUEUE_NAMES.AI_TASKS, { connection });
export const scrapingQueue = new Queue(QUEUE_NAMES.SCRAPING, { connection });
export const applicationsQueue = new Queue(QUEUE_NAMES.APPLICATIONS, {
  connection,
});

// ── Queue default options ─────────────────────────────────────
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};
