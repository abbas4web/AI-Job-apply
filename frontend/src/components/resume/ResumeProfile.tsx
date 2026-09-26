import {
  Lightbulb,
  Cpu,
  Briefcase,
  GraduationCap,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResumeProfile as ResumeProfileType } from '@/lib/resumes';

interface ResumeProfileProps {
  profile: ResumeProfileType;
  resumeName: string;
}

// ── Pill tag ──────────────────────────────────────────────────
function Tag({ label, color = 'indigo' }: { label: string; color?: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    amber:  'bg-amber-50  text-amber-700  border-amber-100',
    emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',
    gray:   'bg-gray-50   text-gray-600   border-gray-200',
  };
  return (
    <span
      className={cn(
        'inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colors[color] ?? colors.indigo
      )}
    >
      {label}
    </span>
  );
}

// ── Section wrapper ────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
export function ResumeProfile({ profile, resumeName }: ResumeProfileProps) {
  const analyzedAt = new Date(profile.analyzedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // education may come back as raw JSON from Prisma
  const education = Array.isArray(profile.education)
    ? (profile.education as unknown as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{resumeName}</h2>
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            Analyzed {analyzedAt}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          {profile.yearsOfExperience} yr{profile.yearsOfExperience !== 1 ? 's' : ''} experience
        </div>
      </div>

      {/* Summary */}
      <Section icon={FileText} title="Summary">
        <p className="text-sm leading-relaxed text-gray-600">{profile.summary}</p>
      </Section>

      {/* Two-col grid for skills + technologies */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Section icon={Lightbulb} title={`Skills (${profile.skills.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.length > 0
              ? profile.skills.map((s) => <Tag key={s} label={s} color="indigo" />)
              : <p className="text-xs text-gray-400">None detected</p>}
          </div>
        </Section>

        <Section icon={Cpu} title={`Technologies (${profile.technologies.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {profile.technologies.length > 0
              ? profile.technologies.map((t) => <Tag key={t} label={t} color="amber" />)
              : <p className="text-xs text-gray-400">None detected</p>}
          </div>
        </Section>
      </div>

      {/* Job titles */}
      {profile.jobTitles.length > 0 && (
        <Section icon={Briefcase} title="Relevant job titles">
          <div className="flex flex-wrap gap-1.5">
            {profile.jobTitles.map((t) => <Tag key={t} label={t} color="emerald" />)}
          </div>
        </Section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Section icon={GraduationCap} title="Education">
          <ul className="space-y-2">
            {education.map((entry, i) => {
              const institution = String(entry.institution ?? '');
              const degree = String(entry.degree ?? '');
              const field = entry.field ? String(entry.field) : null;
              const year = entry.year ? String(entry.year) : null;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                  <div>
                    <span className="font-medium text-gray-900">
                      {degree}{field ? ` in ${field}` : ''}
                    </span>
                    <span className="text-gray-500">
                      {' · '}{institution}{year ? `, ${year}` : ''}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}
