import type { Response } from 'express';
import { logger } from '../utils/logger';

// ── Event types ───────────────────────────────────────────────

export type SseEventType =
  | 'job.found'
  | 'job.matched'
  | 'ai.matching.completed'
  | 'ai.matching.failed'
  | 'application.created'
  | 'email.sent'
  | 'email.failed'
  | 'automation.error'
  | 'ping';

export interface SseEvent<T = unknown> {
  type: SseEventType;
  payload: T;
  timestamp: string;
}

// ── Connection registry ────────────────────────────────────────
// Maps userId → Set of active SSE response streams.
// A user can have multiple browser tabs open simultaneously.

class SseService {
  private connections = new Map<string, Set<Response>>();

  /** Register a new SSE connection for a user. */
  addConnection(userId: string, res: Response): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(res);
    logger.debug(
      `[SSE] connection added — userId=${userId} total=${this.connections.get(userId)!.size}`
    );
  }

  /** Remove a connection (called on client disconnect). */
  removeConnection(userId: string, res: Response): void {
    const conns = this.connections.get(userId);
    if (!conns) return;
    conns.delete(res);
    if (conns.size === 0) this.connections.delete(userId);
    logger.debug(`[SSE] connection removed — userId=${userId}`);
  }

  /** Emit an event to all active connections for a specific user. */
  emit<T>(userId: string, type: SseEventType, payload: T): void {
    const conns = this.connections.get(userId);
    if (!conns || conns.size === 0) return;

    const event: SseEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

    const dead: Response[] = [];
    for (const res of conns) {
      try {
        res.write(data);
        // flush for Node http — works with both http and https
        if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
          (res as unknown as { flush: () => void }).flush();
        }
      } catch {
        dead.push(res);
      }
    }

    // Prune dead connections
    for (const res of dead) this.removeConnection(userId, res);
  }

  /** Broadcast to ALL connected users (e.g. new job found). */
  broadcast<T>(type: SseEventType, payload: T): void {
    for (const userId of this.connections.keys()) {
      this.emit(userId, type, payload);
    }
  }

  /** How many users currently have an open connection. */
  get connectedUsers(): number {
    return this.connections.size;
  }
}

// Singleton — imported directly by workers and controllers
export const sseService = new SseService();
