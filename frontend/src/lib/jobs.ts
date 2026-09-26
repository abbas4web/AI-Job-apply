import { apiClient } from './api';

// ── Enums (mirror backend Prisma enums) ───────────────────────

export type JobSource =
  | 'LINKEDIN'
  | 'INDEED'
  | 'GLASSDOOR'
  | 'COMPANY_SITE'
  | 'REFERRAL'
  | 'OTHER';

export type ApplicationStatus =
  | 'SAVED'
  | 'MATCHED'
  | 'READY_TO_APPLY'
  | 'APPLIED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED';

// ── Types ─────────────────────────────────────────────────────

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  source: JobSource;
  sourceUrl: string;
  externalId: string | null;
  salary: string | null;
  isDuplicate: boolean;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined from the user's application (when fetching with user context)
  matchScore?: number | null;
  applicationStatus?: ApplicationStatus | null;
}

export interface PaginatedJobs {
  data: Job[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface JobFilters {
  page?: number;
  limit?: number;
  search?: string;
  source?: JobSource;
  isDuplicate?: boolean;
}

// ── API functions ─────────────────────────────────────────────

/** GET /jobs — paginated, filterable list */
export async function fetchJobs(filters: JobFilters = {}): Promise<PaginatedJobs> {
  const params = new URLSearchParams();
  if (filters.page)        params.set('page',        String(filters.page));
  if (filters.limit)       params.set('limit',       String(filters.limit));
  if (filters.search)      params.set('search',      filters.search);
  if (filters.source)      params.set('source',      filters.source);
  if (filters.isDuplicate !== undefined)
    params.set('isDuplicate', String(filters.isDuplicate));

  const res = await apiClient.get<{ success: boolean } & PaginatedJobs>(
    `/jobs?${params.toString()}`
  );
  // Backend spreads pagination directly onto response (not nested under data)
  return {
    data:  res.data.data,
    total: res.data.total,
    page:  res.data.page,
    limit: res.data.limit,
    pages: res.data.pages,
  };
}

/** GET /jobs/:id */
export async function fetchJobById(id: string): Promise<Job> {
  const res = await apiClient.get<{ success: boolean; data: Job }>(`/jobs/${id}`);
  return res.data.data;
}

/** POST /jobs/:jobId/match — trigger AI match for current user */
export async function matchJob(jobId: string): Promise<{ matchScore: number }> {
  const res = await apiClient.post<{ success: boolean; data: { matchScore: number } }>(
    `/jobs/${jobId}/match`
  );
  return res.data.data;
}

// ── Display helpers ───────────────────────────────────────────

export const SOURCE_LABELS: Record<JobSource, string> = {
  LINKEDIN:     'LinkedIn',
  INDEED:       'Indeed',
  GLASSDOOR:    'Glassdoor',
  COMPANY_SITE: 'Company site',
  REFERRAL:     'Referral',
  OTHER:        'Other',
};

export const ALL_SOURCES: JobSource[] = [
  'LINKEDIN', 'INDEED', 'GLASSDOOR', 'COMPANY_SITE', 'REFERRAL', 'OTHER',
];
