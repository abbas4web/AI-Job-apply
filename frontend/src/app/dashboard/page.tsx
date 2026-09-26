'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  Zap,
  Send,
  Calendar,
  BarChart3,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

import { DashboardShell } from '@/components/layout';
import { StatCard, Button } from '@/components/ui';
import { fetchDashboardStats, type DashboardStats, type RecentApplication } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

// ── Application status badge ──────────────────────────────────
const statusConfig: Record<string, { label: string; className: string }> = {
  SAVED:          { label: 'Saved',          className: 'bg-gray-100 text-gray-600'     },
  MATCHED:        { label: 'Matched',        className: 'bg-indigo-100 text-indigo-700' },
  READY_TO_APPLY: { label: 'Ready',          className: 'bg-blue-100 text-blue-700'     },
  APPLIED:        { label: 'Applied',        className: 'bg-amber-100 text-amber-700'   },
  INTERVIEW:      { label: 'Interview',      className: 'bg-emerald-100 text-emerald-700'},
  OFFER:          { label: 'Offer',          className: 'bg-green-100 text-green-700'   },
  REJECTED:       { label: 'Rejected',       className: 'bg-red-100 text-red-600'       },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ── Match score pill ──────────────────────────────────────────
function MatchScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>;
  const color =
    score >= 75 ? 'text-emerald-600' :
    score >= 50 ? 'text-amber-600'   :
                  'text-red-500';
  return <span className={cn('text-sm font-semibold tabular-nums', color)}>{score}%</span>;
}

// ── Application status breakdown bar ─────────────────────────
const BAR_COLORS: Record<string, string> = {
  MATCHED:        'bg-indigo-500',
  APPLIED:        'bg-amber-500',
  INTERVIEW:      'bg-emerald-500',
  OFFER:          'bg-green-500',
  READY_TO_APPLY: 'bg-blue-500',
  SAVED:          'bg-gray-300',
  REJECTED:       'bg-red-400',
};

function StatusBreakdownBar({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((s, n) => s + n, 0);
  if (total === 0) return null;

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        {entries.map(([status, count]) => (
          <div
            key={status}
            title={`${statusConfig[status]?.label ?? status}: ${count}`}
            className={cn('h-full', BAR_COLORS[status] ?? 'bg-gray-400')}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className={cn('h-2 w-2 rounded-full', BAR_COLORS[status] ?? 'bg-gray-400')} />
            <span>{statusConfig[status]?.label ?? status}</span>
            <span className="font-medium text-gray-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent applications table ─────────────────────────────────
function RecentApplicationsTable({ rows, isLoading }: {
  rows: RecentApplication[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
            <div className="h-4 w-10 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <Briefcase className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No applications yet</p>
        <Link href="/jobs" className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Browse jobs →
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-2 text-left text-xs font-medium text-gray-400">Job</th>
            <th className="pb-2 text-left text-xs font-medium text-gray-400">Company</th>
            <th className="pb-2 text-left text-xs font-medium text-gray-400">Status</th>
            <th className="pb-2 text-right text-xs font-medium text-gray-400">Match</th>
            <th className="pb-2 text-right text-xs font-medium text-gray-400">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((app) => (
            <tr key={app.id} className="group">
              <td className="py-2.5 pr-4 font-medium text-gray-900">{app.jobTitle}</td>
              <td className="py-2.5 pr-4 text-gray-500">{app.company}</td>
              <td className="py-2.5 pr-4"><StatusBadge status={app.status} /></td>
              <td className="py-2.5 pr-4 text-right"><MatchScore score={app.matchScore} /></td>
              <td className="py-2.5 text-right text-gray-400">
                {new Date(app.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const statCards = [
    {
      label: 'Total jobs',
      value: isLoading ? '—' : (stats?.totalJobs ?? 0),
      icon: Briefcase,
      iconColor: 'bg-indigo-50 text-indigo-600',
      description: 'Jobs in the system',
    },
    {
      label: 'AI matched',
      value: isLoading ? '—' : (stats?.matchedJobs ?? 0),
      icon: Zap,
      iconColor: 'bg-amber-50 text-amber-600',
      description: 'Scored by Gemini',
    },
    {
      label: 'Applications',
      value: isLoading ? '—' : (stats?.totalApplications ?? 0),
      icon: Send,
      iconColor: 'bg-emerald-50 text-emerald-600',
      description: 'Across all statuses',
    },
    {
      label: 'Interviews',
      value: isLoading ? '—' : (stats?.interviews ?? 0),
      icon: Calendar,
      iconColor: 'bg-rose-50 text-rose-600',
      description: 'Scheduled or completed',
    },
    {
      label: 'Avg match score',
      value: isLoading ? '—' : (stats?.averageMatchScore !== null && stats?.averageMatchScore !== undefined ? `${stats.averageMatchScore}%` : '—'),
      icon: BarChart3,
      iconColor: 'bg-purple-50 text-purple-600',
      description: 'Across all AI results',
    },
  ];

  return (
    <DashboardShell
      title="Dashboard"
      actions={
        <Link href="/jobs">
          <Button size="sm" leftIcon={<ArrowRight className="h-4 w-4" />}>
            Browse jobs
          </Button>
        </Link>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load stats: {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <StatCard key={card.label} isLoading={isLoading} {...card} />
        ))}
      </div>

      {/* Lower section — breakdown + recent activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Application status breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Application breakdown</h2>
            <Link href="/applications" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            </div>
          ) : (
            <StatusBreakdownBar data={stats?.applicationsByStatus ?? {}} />
          )}

          {/* Counts list */}
          {!isLoading && stats && (
            <div className="mt-4 space-y-2">
              {Object.entries(stats.applicationsByStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {statusConfig[status]?.label ?? status}
                    </span>
                    <span className="font-semibold tabular-nums text-gray-900">{count}</span>
                  </div>
                ))}
              {Object.keys(stats.applicationsByStatus).length === 0 && (
                <p className="text-sm text-gray-400">No applications yet</p>
              )}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Recent applications</h2>
            </div>
            <Link href="/applications" className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          <RecentApplicationsTable
            rows={stats?.recentApplications ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
