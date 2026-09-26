import { apiClient } from './api';

// ── Types ─────────────────────────────────────────────────────

export interface Resume {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field?: string;
  year?: number | string;
}

export interface ResumeProfile {
  id: string;
  resumeId: string;
  summary: string;
  skills: string[];
  yearsOfExperience: number;
  jobTitles: string[];
  technologies: string[];
  education: EducationEntry[];
  analyzedAt: string;
  updatedAt: string;
}

export interface ResumeAnalysisResult extends Omit<ResumeProfile, 'id' | 'resumeId'> {
  resumeId: string;
  profileId: string;
  analyzedAt: string;
}

export interface UploadResumePayload {
  file: File;
  name: string;
  isDefault?: boolean;
}

// ── API functions ─────────────────────────────────────────────

/** GET /resumes — list all resumes for the current user */
export async function fetchResumes(): Promise<Resume[]> {
  const res = await apiClient.get<{ success: boolean; data: Resume[] }>('/resumes');
  return res.data.data;
}

/** GET /resumes/:id — get a single resume with content */
export async function fetchResumeById(id: string): Promise<Resume & { content: string }> {
  const res = await apiClient.get<{ success: boolean; data: Resume & { content: string } }>(
    `/resumes/${id}`
  );
  return res.data.data;
}

/** POST /resumes — upload a PDF (multipart/form-data) */
export async function uploadResume(payload: UploadResumePayload): Promise<Resume> {
  const form = new FormData();
  form.append('resume', payload.file);
  form.append('name', payload.name);
  if (payload.isDefault !== undefined) {
    form.append('isDefault', String(payload.isDefault));
  }

  const res = await apiClient.post<{ success: boolean; data: Resume }>('/resumes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/** PATCH /resumes/:id — update name or isDefault */
export async function updateResume(
  id: string,
  payload: { name?: string; isDefault?: boolean }
): Promise<Resume> {
  const res = await apiClient.patch<{ success: boolean; data: Resume }>(
    `/resumes/${id}`,
    payload
  );
  return res.data.data;
}

/** DELETE /resumes/:id */
export async function deleteResume(id: string): Promise<void> {
  await apiClient.delete(`/resumes/${id}`);
}

/** POST /resumes/:id/analyze — run Gemini analysis, persists and returns profile */
export async function analyzeResume(id: string): Promise<ResumeAnalysisResult> {
  const res = await apiClient.post<{ success: boolean; data: ResumeAnalysisResult }>(
    `/resumes/${id}/analyze`
  );
  return res.data.data;
}

/** GET /resumes/:id/analyze — return last stored analysis without re-running Gemini */
export async function fetchResumeAnalysis(id: string): Promise<ResumeProfile> {
  const res = await apiClient.get<{ success: boolean; data: ResumeProfile }>(
    `/resumes/${id}/analyze`
  );
  return res.data.data;
}
