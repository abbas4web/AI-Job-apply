import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { redis } from './config/redis';
import { prisma } from './config/database';
import { logger } from './utils/logger';

async function bootstrap() {
  // ── Database ────────────────────────────────────────────────
  await prisma.$connect();
  logger.info('Database connected');

  // ── Redis ───────────────────────────────────────────────────
  // BullMQ Queue instances (imported transitively) already call
  // connect() on the shared redis client at module load time.
  // Calling connect() again would throw "already connecting/connected".
  // Instead, wait for the client to be ready before proceeding.
  await new Promise<void>((resolve, reject) => {
    if (redis.status === 'ready') return resolve();
    redis.once('ready', resolve);
    redis.once('error', reject);
  });
  logger.info('Redis connected');

  // ── Express ─────────────────────────────────────────────────
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running → http://localhost:${env.PORT}`);
    logger.info(`Environment   → ${env.NODE_ENV}`);
    logger.info(`API prefix    → http://localhost:${env.PORT}/api/v1`);
    logger.info(`Health check  → http://localhost:${env.PORT}/api/v1/health`);
  });

  // ── Graceful shutdown ───────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
