import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';

// GET /api/health
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, string> = {};

  // ── Database ────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // ── Redis ───────────────────────────────────────────────────
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  });
}
