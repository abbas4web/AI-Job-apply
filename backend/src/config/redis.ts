import Redis from 'ioredis';
import { env } from './env';

// ─────────────────────────────────────────────────────────────
// Redis connection options
//
// maxRetriesPerRequest: null is REQUIRED by BullMQ — it lets the
// library manage its own retry logic instead of ioredis short-
// circuiting blocked commands.
// ─────────────────────────────────────────────────────────────

interface RedisOptions {
  /** Tag shown in error logs to identify which process owns this connection */
  label?: string;
  /** Skip automatic connect() on construction — useful for the shared instance */
  lazyConnect?: boolean;
}

function buildRedisOptions(opts: RedisOptions = {}) {
  return {
    host:                 env.REDIS_HOST,
    port:                 env.REDIS_PORT,
    password:             env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null,   // required by BullMQ
    lazyConnect:          opts.lazyConnect ?? false,
    // Reconnect with capped exponential back-off (max 30 s)
    retryStrategy: (times: number) => Math.min(times * 500, 30_000),
  };
}

// ── Shared instance ───────────────────────────────────────────
// Used by Queue instances (producers) and the API server.
// BullMQ connects this client automatically when queues are created —
// do NOT set lazyConnect here or call connect() manually in server.ts.

export const redis = new Redis(buildRedisOptions({ lazyConnect: false }));

redis.on('connect', () => console.log('[Redis] connected'));
redis.on('error',   (err) => console.error('[Redis] error:', err));
redis.on('close',   () => console.log('[Redis] connection closed'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

// ── Connection factory ────────────────────────────────────────
// BullMQ Workers MUST each have their own ioredis instance —
// they use blocking commands (BRPOP) which pin the connection
// and make it unusable for anything else.
//
// Call createRedisConnection() once per Worker constructor.

export function createRedisConnection(label = 'worker'): Redis {
  const conn = new Redis(buildRedisOptions({ lazyConnect: false }));

  conn.on('connect', () => console.log(`[Redis:${label}] connected`));
  conn.on('error',   (err) => console.error(`[Redis:${label}] error:`, err));
  conn.on('close',   () => console.log(`[Redis:${label}] connection closed`));

  return conn;
}
