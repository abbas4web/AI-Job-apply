'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck, Briefcase, Zap, Send, Mail, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerEvents, type SseEvent, type SseEventType } from '@/hooks/useServerEvents';

// ── Notification model ────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: SseEventType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  variant: 'info' | 'success' | 'warning' | 'error';
}

// ── Map SSE events → human-readable notifications ─────────────

function eventToNotification(event: SseEvent): AppNotification | null {
  if (event.type === 'ping') return null;

  const id = `${event.type}-${Date.now()}-${Math.random()}`;
  const ts = new Date(event.timestamp);
  const p = event.payload as Record<string, unknown>;

  const base = { id, type: event.type, timestamp: ts, read: false };

  switch (event.type) {
    case 'job.found':
      return { ...base, variant: 'success',
        title: `${p.count} new job${Number(p.count) !== 1 ? 's' : ''} found`,
        body: `Ingested from: ${(p.sources as string[]).join(', ')}` };

    case 'job.matched':
      return { ...base, variant: 'success',
        title: 'Job matched',
        body: p.matchScore != null ? `Match score: ${p.matchScore}%` : 'AI scored your resume against a new job.' };

    case 'ai.matching.completed':
      return { ...base, variant: 'success',
        title: 'AI matching complete',
        body: `Score: ${p.matchScore ?? '—'}% · ${(p.matchedSkills as string[]).length} matched skills` };

    case 'ai.matching.failed':
      return { ...base, variant: 'error',
        title: 'AI matching failed',
        body: String(p.message ?? 'An error occurred during matching.') };

    case 'application.created':
      return { ...base, variant: 'info',
        title: 'Application created',
        body: 'Your application has been saved.' };

    case 'email.sent':
      return { ...base, variant: 'success',
        title: 'Email sent',
        body: `Application email sent to ${p.recipientEmail} for ${p.jobTitle} at ${p.company}.` };

    case 'email.failed':
      return { ...base, variant: 'error',
        title: 'Email failed',
        body: String(p.message ?? 'Could not send application email.') };

    case 'automation.error':
      return { ...base, variant: 'error',
        title: 'Automation error',
        body: String(p.message ?? 'An automation step failed.') };

    default:
      return null;
  }
}

// ── Icon per variant ──────────────────────────────────────────

const variantIcon: Record<AppNotification['variant'], React.ReactNode> = {
  success: <CheckCheck className="h-4 w-4" />,
  info:    <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error:   <AlertTriangle className="h-4 w-4" />,
};

const variantStyle: Record<AppNotification['variant'], string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info:    'bg-indigo-50  text-indigo-700  border-indigo-200',
  warning: 'bg-amber-50   text-amber-700   border-amber-200',
  error:   'bg-red-50     text-red-700     border-red-200',
};

const typeIcon: Partial<Record<SseEventType, React.ReactNode>> = {
  'job.found':              <Briefcase className="h-4 w-4" />,
  'job.matched':            <Zap className="h-4 w-4" />,
  'ai.matching.completed':  <Zap className="h-4 w-4" />,
  'application.created':    <Send className="h-4 w-4" />,
  'email.sent':             <Mail className="h-4 w-4" />,
};

// ── Toast (auto-dismissing popup) ─────────────────────────────

function Toast({ n, onDismiss }: { n: AppNotification; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, n.variant === 'error' ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [n, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm',
        'animate-in slide-in-from-right-4 duration-300',
        variantStyle[n.variant],
        'w-80'
      )}
    >
      <span className="mt-0.5 shrink-0">{typeIcon[n.type] ?? variantIcon[n.variant]}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{n.title}</p>
        <p className="mt-0.5 text-xs opacity-80">{n.body}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Bell + dropdown ───────────────────────────────────────────

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

function NotificationDropdown({ notifications, onMarkAllRead, onDismiss }: NotificationCenterProps) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Notifications {unread > 0 && <span className="ml-1 text-indigo-600">({unread})</span>}
        </h2>
        {unread > 0 && (
          <button onClick={onMarkAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Bell className="mb-2 h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50',
                  !n.read && 'bg-indigo-50/40'
                )}
              >
                <span className={cn('mt-0.5 shrink-0', n.variant === 'error' ? 'text-red-500' : n.variant === 'success' ? 'text-emerald-600' : 'text-indigo-500')}>
                  {typeIcon[n.type] ?? variantIcon[n.variant]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {n.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => onDismiss(n.id)} className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-500" aria-label="Dismiss">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Main export — bell button + toast stack ───────────────────

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleEvent = useCallback((event: SseEvent) => {
    const n = eventToNotification(event);
    if (!n) return;

    setNotifications((prev) => [n, ...prev].slice(0, 50)); // keep last 50
    setToasts((prev) => [...prev, n]);
  }, []);

  useServerEvents(handleEvent);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    // Mark as read in notification list too
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Bell button */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => {
            setOpen((v) => !v);
            if (!open) markAllRead();
          }}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-indigo-600">
              <span className="sr-only">{unread} unread</span>
            </span>
          )}
        </button>

        {open && (
          <NotificationDropdown
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onDismiss={dismissNotification}
          />
        )}
      </div>

      {/* Toast stack — bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
      >
        {toasts.map((t) => (
          <Toast key={t.id} n={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </div>
    </>
  );
}
