'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ALL_SOURCES, SOURCE_LABELS, type JobSource, type JobFilters } from '@/lib/jobs';

interface JobFiltersProps {
  filters: JobFilters;
  total: number;
  onChange: (updated: Partial<JobFilters>) => void;
  onReset: () => void;
}

const LIMIT_OPTIONS = [10, 20, 50];

export function JobFiltersBar({ filters, total, onChange, onReset }: JobFiltersProps) {
  // Debounce search input so we don't fire on every keystroke
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft when filters.search is reset externally
  useEffect(() => {
    setSearchDraft(filters.search ?? '');
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ search: value || undefined, page: 1 });
    }, 350);
  };

  const clearSearch = () => {
    setSearchDraft('');
    onChange({ search: undefined, page: 1 });
  };

  const hasActiveFilters = !!(filters.search || filters.source);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Row 1: search + source filter */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search title, company, location…"
            className={cn(
              'h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 text-sm text-gray-900',
              'placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
            )}
          />
          {searchDraft && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-400" />
          <select
            value={filters.source ?? ''}
            onChange={(e) =>
              onChange({ source: (e.target.value as JobSource) || undefined, page: 1 })
            }
            className={cn(
              'h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700',
              'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
            )}
          >
            <option value="">All sources</option>
            {ALL_SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Per-page */}
        <select
          value={filters.limit ?? 20}
          onChange={(e) => onChange({ limit: Number(e.target.value), page: 1 })}
          className={cn(
            'h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700',
            'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
          )}
          aria-label="Results per page"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} per page</option>
          ))}
        </select>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Row 2: result count */}
      <p className="text-xs text-gray-400">
        {total.toLocaleString()} job{total !== 1 ? 's' : ''} found
        {filters.search && (
          <> for <span className="font-medium text-gray-600">&ldquo;{filters.search}&rdquo;</span></>
        )}
        {filters.source && (
          <> · source: <span className="font-medium text-gray-600">{SOURCE_LABELS[filters.source]}</span></>
        )}
      </p>
    </div>
  );
}
