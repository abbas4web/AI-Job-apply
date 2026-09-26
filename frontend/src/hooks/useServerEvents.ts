'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';

// ── Event types (mirror backend SseEventType) ─────────────────
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

// ── Typed payloads ────────────────────────────────────────────
export interface JobFoundPayload    { count: number; sources: string[] }
export interface JobMatchedPayload  { jobId: string; resumeId: string; matchScore: number | null }
export interface AiMatchCompletedPayload {
  jobId: string; resumeId: string; matchScore: number | null;
  matchedSkills: string[]; missingSkills: string[];
}
export interface AiMatchFailedPayload    { jobId: string; resumeId: string; message: string }
export interface ApplicationCreatedPayload { applicationId: string; jobId: string }
export interface EmailSentPayload   { applicationId: string; recipientEmail: string; jobTitle: string; company: string }
export interface EmailFailedPayload { applicationId: string; message: string }
export interface AutomationErrorPayload { jobId?: string; message: string }

export type SseHandler = (event: SseEvent) => void;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * useServerEvents — opens an SSE connection to GET /api/v1/events
 * and calls `onEvent` for every incoming message.
 *
 * - Auto-reconnects with exponential back-off (capped at 30 s)
 * - Closes + does not reconnect when the user logs out (no token)
 * - Safe to mount multiple times (only one connection per hook instance)
 */
export function useServerEvents(onEvent: SseHandler): void {
  const token = useAuthStore((s) => s.token);
  const onEventRef = useRef<SseHandler>(onEvent);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(2_000);
  const unmounted = useRef(false);

  // Keep handler ref current without re-running the effect
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const connect = useCallback(() => {
    if (unmounted.current || !token) return;

    // EventSource doesn't support custom headers, so we pass the
    // JWT as a query param. The backend authenticate middleware
    // reads Authorization header first; we add header support below.
    // For simplicity we append the token as a query string — the
    // backend's authenticate middleware needs to also check query param.
    const url = `${API_URL}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    const handleEvent = (raw: MessageEvent) => {
      try {
        const event = JSON.parse(raw.data) as SseEvent;
        onEventRef.current(event);
      } catch {
        // malformed frame — ignore
      }
    };

    // Listen for every named event type
    const EVENTS: SseEventType[] = [
      'job.found', 'job.matched', 'ai.matching.completed',
      'ai.matching.failed', 'application.created', 'email.sent',
      'email.failed', 'automation.error', 'ping',
    ];
    for (const type of EVENTS) {
      es.addEventListener(type, handleEvent);
    }

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (unmounted.current || !token) return;
      // Exponential back-off
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY_MS);
        connect();
      }, reconnectDelay.current);
    };

    es.onopen = () => {
      reconnectDelay.current = 2_000; // reset on successful open
    };
  }, [token]);

  useEffect(() => {
    unmounted.current = false;

    if (!token) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }

    connect();

    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [token, connect]);
}
