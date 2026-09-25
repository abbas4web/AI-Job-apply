// ─────────────────────────────────────────────────────────────
// Shared Types & Interfaces
// ─────────────────────────────────────────────────────────────

import { JobStatus, ApplicationSource, UserRole } from './enums';

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

// ── Job Listing ───────────────────────────────────────────────
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: ApplicationSource;
  salary?: string;
  postedAt?: string;
  createdAt: string;
}

// ── Job Application ───────────────────────────────────────────
export interface JobApplication {
  id: string;
  userId: string;
  jobListingId: string;
  jobListing?: JobListing;
  status: JobStatus;
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
  sources: ApplicationSource[];
}
