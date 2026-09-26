/**
 * workers.ts — standalone worker process entry point.
 *
 * Run separately from the API server:
 *   dev:   tsx watch src/workers.ts
 *   prod:  node dist/workers.js
 *
 * This process connects to the database and Redis, starts all
 * three workers, then waits for jobs.  It does NOT start an
 * HTTP server.
 *
 * Graceful shutdown: on SIGTERM / SIGINT each worker drains its
 * active job (if any) before closing, then the DB and Redis
 * connections are released.
 */

import 'dotenv/config';
import { type Worker } from 'bullmq';
import { prisma } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { createJobProcessingWorker } from './queues/workers/jobProcessingWorker';
import { createAiMatchingWorker } from './queues/workers/aiMatchingWorker';
import { createEmailWorker } from './queues/workers/emailWorker';

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  logger.info('[workers] Starting worker process…');

  // ── Database ────────────────────────────────────────────────
  await prisma.$connect();
  logger.info('[workers] Database connected');

  // ── Redis ───────────────────────────────────────────────────
  // The shared `redis` instance (used by Queue producers) needs
  // an explicit connect because it was created with lazyConnect.
  // Each Worker creates its own connection internally via
  // createRedisConnection(), so no extra connect call needed there.
  await connectRedis();
  logger.info('[workers] Redis connected');

  // ── Start workers ───────────────────────────────────────────
  const workers: Worker[] = [
    createJobProcessingWorker(),
    createAiMatchingWorker(),
    createEmailWorker(),
  ];

  logger.info(
    `[workers] ${workers.length} workers running: ` +
    'job-processing, ai-matching, email-processing',
  );

  // ── Graceful shutdown ───────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info(`[workers] ${signal} received — draining workers…`);

    // close() waits for the active job (if any) to finish, then
    // closes the worker's Redis connection.
    await Promise.all(workers.map((w) => w.close()));
    logger.info('[workers] All workers closed');

    await prisma.$disconnect();
    logger.info('[workers] Database disconnected');

    // Individual worker connections are closed by w.close() above.
    // The shared producer redis instance can be quit last.
    const { disconnectRedis } = await import('./config/redis');
    await disconnectRedis();
    logger.info('[workers] Redis disconnected');

    process.exit(0);
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  // Surface unhandled rejections so they don't silently die
  process.on('unhandledRejection', (reason) => {
    logger.error('[workers] Unhandled rejection:', String(reason));
  });
}

bootstrap().catch((err) => {
  logger.error('[workers] Failed to start:', err);
  process.exit(1);
});
