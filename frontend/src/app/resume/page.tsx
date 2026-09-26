'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Zap, FileText } from 'lucide-react';

import { DashboardShell } from '@/components/layout';
import { Button } from '@/components/ui';
import { UploadZone, ResumeCard, ResumeProfile } from '@/components/resume';
import {
  fetchResumes,
  uploadResume,
  deleteResume,
  updateResume,
  analyzeResume,
  fetchResumeAnalysis,
  type Resume,
  type ResumeProfile as ResumeProfileType,
} from '@/lib/resumes';

// ── Toast-style inline notification ──────────────────────────
function Alert({
  type,
  message,
  onDismiss,
}: {
  type: 'error' | 'success';
  message: string;
  onDismiss: () => void;
}) {
  const styles =
    type === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles}`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 font-medium opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ── Skeleton loader for resume cards ─────────────────────────
function ResumeCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
      <div className="mt-3 h-8 w-full animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ResumePage() {
  // List state
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Selected resume + its profile
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ResumeProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Per-resume analyze spinner
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Deletion in-progress
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Global notification
  const [notification, setNotification] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const notify = (type: 'error' | 'success', message: string) => {
    setNotification({ type, message });
    // Auto-dismiss successes after 4 s
    if (type === 'success') setTimeout(() => setNotification(null), 4000);
  };

  // ── Load list ─────────────────────────────────────────────
  const loadResumes = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const data = await fetchResumes();
      setResumes(data);
      // Auto-select the default resume (or first one) if nothing is selected
      if (!selectedId && data.length > 0) {
        const def = data.find((r) => r.isDefault) ?? data[0];
        setSelectedId(def.id);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load resumes');
    } finally {
      setIsLoadingList(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load profile when selection changes ───────────────────
  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }
    setIsLoadingProfile(true);
    setProfile(null);
    fetchResumeAnalysis(selectedId)
      .then(setProfile)
      .catch(() => setProfile(null)) // 404 = not analyzed yet, that's fine
      .finally(() => setIsLoadingProfile(false));
  }, [selectedId]);

  // ── Upload ────────────────────────────────────────────────
  const handleUpload = async (file: File, name: string, isDefault: boolean) => {
    setIsUploading(true);
    try {
      const created = await uploadResume({ file, name, isDefault });
      notify('success', `"${created.name}" uploaded successfully.`);
      setShowUpload(false);
      setSelectedId(created.id);
      await loadResumes();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Analyze ───────────────────────────────────────────────
  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try {
      const result = await analyzeResume(id);
      // Reshape ResumeAnalysisResult → ResumeProfile shape
      const asProfile: ResumeProfileType = {
        id: result.profileId,
        resumeId: result.resumeId,
        summary: result.summary,
        skills: result.skills,
        yearsOfExperience: result.yearsOfExperience,
        jobTitles: result.jobTitles,
        technologies: result.technologies,
        education: result.education,
        analyzedAt: result.analyzedAt,
        updatedAt: result.analyzedAt,
      };
      setProfile(asProfile);
      if (selectedId !== id) setSelectedId(id);
      notify('success', 'Resume analyzed successfully.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  // ── Set default ───────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    try {
      await updateResume(id, { isDefault: true });
      setResumes((prev) =>
        prev.map((r) => ({ ...r, isDefault: r.id === id }))
      );
      notify('success', 'Default resume updated.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update');
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteResume(id);
      const remaining = resumes.filter((r) => r.id !== id);
      setResumes(remaining);
      if (selectedId === id) {
        const next = remaining.find((r) => r.isDefault) ?? remaining[0] ?? null;
        setSelectedId(next?.id ?? null);
      }
      notify('success', 'Resume deleted.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const selectedResume = resumes.find((r) => r.id === selectedId);

  return (
    <DashboardShell
      title="Resume"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            isLoading={isLoadingList}
            onClick={loadResumes}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowUpload((v) => !v)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Upload resume
          </Button>
        </div>
      }
    >
      {/* Notification */}
      {notification && (
        <div className="mb-4">
          <Alert
            type={notification.type}
            message={notification.message}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}

      {/* Upload zone */}
      {showUpload && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            Upload new resume
          </h2>
          <UploadZone
            onUpload={handleUpload}
            isUploading={isUploading}
            hasExisting={resumes.length > 0}
          />
        </div>
      )}

      {/* List error */}
      {listError && (
        <Alert
          type="error"
          message={listError}
          onDismiss={() => setListError(null)}
        />
      )}

      <div className="flex gap-6">
        {/* Left column — resume list */}
        <div className="w-72 shrink-0 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Your resumes
          </p>

          {isLoadingList ? (
            <>
              <ResumeCardSkeleton />
              <ResumeCardSkeleton />
            </>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center">
              <FileText className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No resumes yet</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Upload one →
              </button>
            </div>
          ) : (
            resumes.map((resume) => (
              <div
                key={resume.id}
                className={deletingId === resume.id ? 'pointer-events-none opacity-50' : ''}
              >
                <ResumeCard
                  resume={resume}
                  isSelected={selectedId === resume.id}
                  isAnalyzing={analyzingId === resume.id}
                  onSelect={setSelectedId}
                  onAnalyze={handleAnalyze}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>

        {/* Right column — profile / empty state */}
        <div className="min-w-0 flex-1">
          {isLoadingProfile ? (
            <div className="space-y-4">
              {[80, 56, 40, 64].map((h, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-gray-200 bg-white p-5"
                  style={{ height: `${h * 2}px` }}
                >
                  <div className="mb-3 h-4 w-32 rounded bg-gray-100" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-5/6 rounded bg-gray-100" />
                    <div className="h-3 w-4/6 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : profile && selectedResume ? (
            <ResumeProfile profile={profile} resumeName={selectedResume.name} />
          ) : selectedResume ? (
            // Has a resume selected but not yet analyzed
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                <Zap className="h-7 w-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Not analyzed yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Click{' '}
                <strong className="font-medium text-gray-700">
                  Analyze with AI
                </strong>{' '}
                on the resume card to extract skills, experience, and more with
                Gemini.
              </p>
              <Button
                className="mt-6"
                isLoading={analyzingId === selectedResume.id}
                onClick={() => handleAnalyze(selectedResume.id)}
                leftIcon={<Zap className="h-4 w-4" />}
              >
                {analyzingId === selectedResume.id
                  ? 'Analyzing…'
                  : 'Analyze with AI'}
              </Button>
            </div>
          ) : (
            // No resume selected at all
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-20 text-center">
              <FileText className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                Select a resume to view its analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
