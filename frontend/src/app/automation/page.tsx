'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Plus,
  X,
  Save,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';

import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  fetchAutomationSettings,
  updateAutomationSettings,
  type AutomationSettings,
} from '@/lib/settings';
import { cn } from '@/lib/utils';

// ── Tag input ─────────────────────────────────────────────────
// Renders a list of string tags with an add-on-Enter input.
function TagInput({
  label,
  description,
  values,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) { setDraft(''); return; }
    onChange([...values, trimmed]);
    setDraft('');
    inputRef.current?.focus();
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>

      {/* Tag list */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((val) => (
            <span
              key={val}
              className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 pl-2.5 pr-1.5 py-0.5 text-xs text-gray-700"
            >
              {val}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(val)}
                  className="rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${val}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      {!disabled && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="h-8 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            aria-label="Add"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: 'red' | 'indigo';
}) {
  const iconBg  = accent === 'red' ? 'bg-red-50'    : 'bg-indigo-50';
  const iconClr = accent === 'red' ? 'text-red-600' : 'text-indigo-600';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg)}>
          <Icon className={cn('h-5 w-5', iconClr)} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

// ── Auto-apply warning modal ───────────────────────────────────
function AutoApplyWarningModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <>
      <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="warn-title"
        aria-describedby="warn-desc"
        className="fixed left-1/2 top-1/2 z-30 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <TriangleAlert className="h-6 w-6 text-red-600" />
        </div>

        <h2 id="warn-title" className="text-base font-semibold text-gray-900">
          Enable automatic applications?
        </h2>

        <div id="warn-desc" className="mt-3 space-y-3 text-sm text-gray-600">
          <p>
            With auto-apply enabled, AI Job Apply will submit job applications
            on your behalf — without asking for confirmation each time.
          </p>
          <ul className="space-y-1.5 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-800">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              Applications will be sent automatically when a job meets your criteria.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              You are responsible for the content of each application.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              You can disable this at any time, but applications already sent cannot be recalled.
            </li>
          </ul>
          <p>Make sure your minimum match score and filters are set correctly before enabling.</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Yes, enable auto-apply
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ── Skeleton row ──────────────────────────────────────────────
function SkeletonSection() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-64 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100" />
        <div className="h-8 w-3/4 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AutomationPage() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [draft, setDraft] = useState<AutomationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // Whether local draft differs from saved settings
  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAutomationSettings();
      setSettings(data);
      setDraft(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patch = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    setDraft((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  // Called when user clicks Save — intercepts auto-apply toggle
  const handleSave = async () => {
    if (!draft) return;
    // If turning on auto-apply for the first time, show warning first
    if (draft.autoApplyEnabled && !settings?.autoApplyEnabled) {
      setShowWarning(true);
      return;
    }
    await persist(draft);
  };

  const persist = async (data: AutomationSettings) => {
    setIsSaving(true);
    setNotification(null);
    try {
      const saved = await updateAutomationSettings({
        minimumMatchScore:  data.minimumMatchScore,
        preferredJobTitles: data.preferredJobTitles,
        preferredLocations: data.preferredLocations,
        requiredSkills:     data.requiredSkills,
        excludedCompanies:  data.excludedCompanies,
        autoApplyEnabled:   data.autoApplyEnabled,
      });
      setSettings(saved);
      setDraft(saved);
      setNotification({ type: 'success', msg: 'Settings saved.' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Save failed',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmAutoApply = async () => {
    setShowWarning(false);
    if (draft) await persist(draft);
  };

  const cancelAutoApply = () => {
    setShowWarning(false);
    // Revert the toggle
    setDraft((prev) => prev ? { ...prev, autoApplyEnabled: false } : prev);
  };

  return (
    <DashboardShell
      title="Automation Settings"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!isDirty || isLoading}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save changes
          </Button>
        </div>
      }
    >
      {/* Notification */}
      {notification && (
        <div
          role="alert"
          className={cn(
            'mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm',
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} aria-label="Dismiss">
            <X className="h-4 w-4 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-5">
        {isLoading || !draft ? (
          <>
            <SkeletonSection />
            <SkeletonSection />
            <SkeletonSection />
          </>
        ) : (
          <>
            {/* ── Match threshold ──────────────────────────────── */}
            <Section
              icon={Settings}
              title="Match threshold"
              subtitle="Only consider jobs that score at or above this threshold."
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Minimum match score</span>
                  <span className="tabular-nums text-lg font-bold text-indigo-600">
                    {draft.minimumMatchScore}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={draft.minimumMatchScore}
                  onChange={(e) => patch('minimumMatchScore', Number(e.target.value))}
                  className="w-full accent-indigo-600"
                  aria-label="Minimum match score"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0% — apply to anything</span>
                  <span>100% — perfect match only</span>
                </div>
              </div>
            </Section>

            {/* ── Job preferences ──────────────────────────────── */}
            <Section
              icon={Settings}
              title="Job preferences"
              subtitle="Filter jobs before they are considered for matching or auto-apply."
            >
              <TagInput
                label="Preferred job titles"
                description='Job titles you want to target, e.g. "Senior Engineer", "Tech Lead".'
                values={draft.preferredJobTitles}
                placeholder="Add a job title…"
                onChange={(v) => patch('preferredJobTitles', v)}
              />
              <div className="border-t border-gray-100" />
              <TagInput
                label="Preferred locations"
                description='Locations you will accept, e.g. "Remote", "Berlin", "New York".'
                values={draft.preferredLocations}
                placeholder="Add a location…"
                onChange={(v) => patch('preferredLocations', v)}
              />
              <div className="border-t border-gray-100" />
              <TagInput
                label="Required skills"
                description="The job must mention all of these skills to be considered (AND filter)."
                values={draft.requiredSkills}
                placeholder="Add a skill…"
                onChange={(v) => patch('requiredSkills', v)}
              />
              <div className="border-t border-gray-100" />
              <TagInput
                label="Excluded companies"
                description="Jobs from these companies will be skipped entirely."
                values={draft.excludedCompanies}
                placeholder="Add a company…"
                onChange={(v) => patch('excludedCompanies', v)}
              />
            </Section>

            {/* ── Auto-apply ───────────────────────────────────── */}
            <Section
              icon={ShieldAlert}
              title="Automatic applications"
              subtitle="When enabled, the system will submit applications without asking for confirmation."
              accent="red"
            >
              {/* Toggle row */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto-apply</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Automatically submit applications for jobs that pass all your filters.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={draft.autoApplyEnabled}
                  onClick={() => patch('autoApplyEnabled', !draft.autoApplyEnabled)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                    draft.autoApplyEnabled ? 'bg-red-500' : 'bg-gray-300'
                  )}
                >
                  <span className="sr-only">Toggle auto-apply</span>
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200',
                      draft.autoApplyEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {/* Warning banner — always visible when enabled */}
              {draft.autoApplyEnabled && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Auto-apply is <strong>on</strong>. Applications will be submitted automatically
                    for jobs meeting your criteria. Disable this to review jobs manually first.
                  </p>
                </div>
              )}
            </Section>

            {/* ── Save bar (sticky on scroll) ──────────────────── */}
            {isDirty && (
              <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-lg">
                <p className="text-sm text-indigo-700">You have unsaved changes.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDraft(settings)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Discard
                  </button>
                  <Button size="sm" onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
                    Save
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auto-apply warning modal */}
      {showWarning && (
        <AutoApplyWarningModal onConfirm={confirmAutoApply} onCancel={cancelAutoApply} />
      )}
    </DashboardShell>
  );
}
