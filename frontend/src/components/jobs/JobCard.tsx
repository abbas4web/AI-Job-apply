'use client';

import { MapPin, Building2, ExternalLink, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOURCE_LABELS, type Job, type ApplicationStatus } from '@/lib/jobs';

// ── Status badge config ────────────────────────────────────────
const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  SAVED:          { label: 'Saved',          className: 'bg-gray-100 text-gray-600'       },
  MATCHED:        { label: 'Matched',        className: 'bg-indigo-100 text-indigo-700'   },
  READY_TO_APPLY: { label: 'Ready to apply', className: 'bg-blue-100 text-blue-700'       },
  APPLIED:        { label: 'Applied',        className: 'bg-amber-100 text-amber-700'     },
  INTERVIEW:      { label: 'Interview',      className: 'bg-emerald-100 text-emerald-700' },
  OFFER:          { label: 'Offer',          className: 'bg-green-100 text-green-700'     },
  REJECTED:       { label: 'Rejected',       className: 'bg-red-100 text-red-600'         },
};

// ── Source badge config ────────────────────────────────────────
const sourceColors: Record<string, string> = {
  LINKEDIN:     'bg-blue-50 text-blue-700',
  INDEED:       'bg-violet-50 text-violet-700',
  GLASSDOOR:    'bg-green-50 text-green-700',
  COMPANY_SITE: 'bg-orange-50 text-orange-700',
  REFERRAL:     'bg-pink-50 text-pink-700',
  OTHER:        'bg-gray-100 text-gray-600',
};

// ── Match score pill ──────────────────────────────────────────
function MatchScore({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const color =
    score >= 75 ? 'bg-emerald-50 text-emerald-700' :
    score >= 50 ? 'bg-amber-50 text-amber-700'     :
                  'bg-red-50 text-red-600';
  return (
    <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', color)}>
      <Zap className="h-3 w-3" />
      {score}% match
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────
interface JobCardProps {
  job: Job;
  onClick?: (job: Job) => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const status = job.applicationStatus;
  const statusCfg = status ? statusConfig[status] : null;
  const MAX_SKILLS = 5;

  const postedDate = job.postedAt
    ? new Date(job.postedAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <article
      onClick={() => onClick?.(job)}
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm',
        'transition-all duration-150 hover:border-indigo-300 hover:shadow-md',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        {/* Company avatar + title */}
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 uppercase">
            {job.company.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-700">
              {job.title}
            </h3>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.company}</span>
            </p>
          </div>
        </div>

        {/* Right badges */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <MatchScore score={job.matchScore} />
          {statusCfg && (
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', statusCfg.className)}>
              {statusCfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          {job.location}
        </span>
        {job.salary && (
          <>
            <span className="text-gray-300">·</span>
            <span>{job.salary}</span>
          </>
        )}
        {postedDate && (
          <>
            <span className="text-gray-300">·</span>
            <span>Posted {postedDate}</span>
          </>
        )}
      </div>

      {/* Skills */}
      {job.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, MAX_SKILLS).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > MAX_SKILLS && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-400">
              +{job.skills.length - MAX_SKILLS} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            sourceColors[job.source] ?? 'bg-gray-100 text-gray-600'
          )}
        >
          {SOURCE_LABELS[job.source]}
        </span>
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          aria-label={`View ${job.title} on ${SOURCE_LABELS[job.source]}`}
        >
          View listing
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}
