'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Briefcase, RefreshCw, X, Zap } from 'lucide-react';

import { DashboardShell } from '@/components/layout';
import { Button, Pagination } from '@/components/ui';
import { JobCard, JobFiltersBar } from '@/components/jobs';
import { fetchJobs, type Job, type JobFilters } from '@/lib/jobs';
import { runIngestion, type IngestionResult } from '@/lib/ingestion';

// ── Ingestion modal ───────────────────────────────────────────
function IngestionModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (result: IngestionResult) => void;
}) {
  const [query, setQuery] = useState('engineer');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await runIngestion({
        query: query.trim() || 'software engineer',
        location: location.trim() || undefined,
        limit,
      });
      setResult(res);
      onDone(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingestion failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Run job ingestion"
        className="fixed left-1/2 top-1/2 z-30 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Run job ingestion</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          // ── Success state ──
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-2">Ingestion complete</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Fetched',  value: result.summary.fetched  },
                  { label: 'Created',  value: result.summary.created  },
                  { label: 'Skipped',  value: result.summary.skipped  },
                  { label: 'Failed',   value: result.summary.failed   },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between rounded bg-white/70 px-3 py-1.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={onClose}>
              View jobs
            </Button>
          </div>
        ) : (
          // ── Form ──
          <form onSubmit={handleRun} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="ing-query">
                Search query <span className="text-red-500">*</span>
              </label>
              <input
                id="ing-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. software engineer"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="ing-location">
                Location <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="ing-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, London"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="ing-limit">
                Max jobs per source
              </label>
              <select
                id="ing-limit"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} jobs</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" isLoading={isRunning} leftIcon={<Zap className="h-4 w-4" />} className="flex-1">
                {isRunning ? 'Running…' : 'Run ingestion'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={isRunning}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

// ── Job detail drawer ─────────────────────────────────────────
function JobDrawer({
  job,
  onClose,
}: {
  job: Job;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${job.title} at ${job.company}`}
        className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{job.title}</h2>
            <p className="text-sm text-gray-500">{job.company} · {job.location}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 p-6">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            {job.salary && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {job.salary}
              </span>
            )}
            {job.matchScore != null && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {job.matchScore}% match
              </span>
            )}
            {job.applicationStatus && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {job.applicationStatus.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* Skills */}
          {job.skills.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Required skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Description
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {job.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            View full listing →
          </a>
        </div>
      </aside>
    </>
  );
}

// ── Card skeleton ──────────────────────────────────────────────
function JobCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="flex gap-1.5">
        {[40, 56, 48].map((w, i) => (
          <div key={i} className="h-5 animate-pulse rounded-full bg-gray-100" style={{ width: w }} />
        ))}
      </div>
      <div className="flex justify-between border-t border-gray-100 pt-3">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

// ── Default filters ────────────────────────────────────────────
const DEFAULT_FILTERS: JobFilters = { page: 1, limit: 20 };

// ── Page ───────────────────────────────────────────────────────
export default function JobsPage() {
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [selected, setSelected] = useState<Job | null>(null);
  const [showIngestion, setShowIngestion] = useState(false);

  // Abort controller so fast filter changes cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (f: JobFilters) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchJobs(f);
      setJobs(result.data);
      setTotal(result.total);
      setPages(result.pages);
    } catch (err) {
      if ((err as Error).name === 'CanceledError') return;
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(filters); }, [filters, load]);

  const updateFilters = (patch: Partial<JobFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <DashboardShell
      title="Jobs"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowIngestion(true)}
            leftIcon={<Zap className="h-4 w-4" />}
          >
            Run ingestion
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={isLoading}
            onClick={() => load(filters)}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      }
    >
      {/* Filters bar */}
      <JobFiltersBar
        filters={filters}
        total={total}
        onChange={updateFilters}
        onReset={resetFilters}
      />

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: filters.limit ?? 20 > 6 ? 6 : (filters.limit ?? 6) }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-gray-300" />
            <h2 className="text-base font-semibold text-gray-900">No jobs found</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.source
                ? 'Try adjusting your search or filters.'
                : 'Run ingestion or add jobs manually to get started.'}
            </p>
            {(filters.search || filters.source) && (
              <button
                onClick={resetFilters}
                className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && jobs.length > 0 && (
        <Pagination
          page={filters.page ?? 1}
          pages={pages}
          total={total}
          limit={filters.limit ?? 20}
          onChange={(p) => updateFilters({ page: p })}
          className="mt-6"
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <JobDrawer job={selected} onClose={() => setSelected(null)} />
      )}

      {/* Ingestion modal */}
      {showIngestion && (
        <IngestionModal
          onClose={() => setShowIngestion(false)}
          onDone={() => {
            setShowIngestion(false);
            load(DEFAULT_FILTERS);
            setFilters(DEFAULT_FILTERS);
          }}
        />
      )}
    </DashboardShell>
  );
}
