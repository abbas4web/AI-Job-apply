// ─────────────────────────────────────────────────────────────
// Shared Types & Interfaces
// ─────────────────────────────────────────────────────────────

import { ApplicationStatus, JobSource, UserRole, ScrapingStatus } from './enums';

// ── Generic API response wrapper ─────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ── Job ───────────────────────────────────────────────────────
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: JobSource;
  salary?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Application ───────────────────────────────────────────────
export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId?: string;
  job?: Job;
  status: ApplicationStatus;
  coverLetter?: string;
  tailoredResume?: string;
  notes?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Resume ────────────────────────────────────────────────────
export interface Resume {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── ScrapingLog ───────────────────────────────────────────────
export interface ScrapingLog {
  id: string;
  userId: string;
  source: JobSource;
  query: string;
  location?: string;
  status: ScrapingStatus;
  jobsFound: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Queue Job Payloads ────────────────────────────────────────
export interface GenerateCoverLetterPayload {
  applicationId: string;
  userId: string;
  jobDescription: string;
  resumeContent: string;
}

export interface TailorResumePayload {
  applicationId: string;
  userId: string;
  jobDescription: string;
  resumeContent: string;
}

export interface ScrapeJobsPayload {
  userId: string;
  query: string;
  location?: string;
  sources: JobSource[];
}

// ── job-processing queue payloads ─────────────────────────────

export interface ProcessJobPayload {
  jobId:    string;
  source:   JobSource;
  /** Raw job data from a scrape — normalised and persisted by the worker */
  rawData?: Record<string, unknown>;
}

export interface DeduplicateJobPayload {
  jobId:      string;
  externalId: string;
  source:     JobSource;
}

// ── ai-matching queue payloads ────────────────────────────────

export interface MatchJobPayload {
  userId:   string;
  jobId:    string;
  /**
   * Optional — if omitted the worker resolves the user's default resume.
   * Pass explicitly when a specific resume should be used.
   */
  resumeId?: string;
}

// ── email-processing queue payloads ──────────────────────────

export interface SendApplicationEmailPayload {
  userId:        string;
  applicationId: string;
  recipientEmail: string;
  jobTitle:      string;
  company:       string;
}

export interface SendMatchDigestPayload {
  userId:  string;
  jobIds:  string[];
  /** ISO date string — the window this digest covers */
  periodEnd: string;
}
