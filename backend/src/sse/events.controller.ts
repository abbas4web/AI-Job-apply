import type { Response } from 'express';
import { sseService } from './SseService';
import type { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/events
 *
 * Upgrades the HTTP connection to a persistent SSE stream.
 * The client receives a `ping` every 25 s to keep the connection
 * alive through proxies and load balancers.
 */
export function sseHandler(req: AuthRequest, res: Response): void {
  const { userId } = req;

  // ── SSE headers ────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx: disable buffering
  res.flushHeaders();

  // ── Register ───────────────────────────────────────────────
  sseService.addConnection(userId, res);
  logger.info(`[SSE] client connected — userId=${userId}`);

  // ── Initial ping so the client knows the stream is live ────
  res.write('event: ping\ndata: {"type":"ping","payload":{},"timestamp":"' +
    new Date().toISOString() + '"}\n\n');

  // ── Keep-alive ping every 25 s ─────────────────────────────
  const pingInterval = setInterval(() => {
    try {
      res.write('event: ping\ndata: {"type":"ping","payload":{},"timestamp":"' +
        new Date().toISOString() + '"}\n\n');
    } catch {
      clearInterval(pingInterval);
    }
  }, 25_000);

  // ── Cleanup on disconnect ──────────────────────────────────
  req.on('close', () => {
    clearInterval(pingInterval);
    sseService.removeConnection(userId, res);
    logger.info(`[SSE] client disconnected — userId=${userId}`);
  });
}
