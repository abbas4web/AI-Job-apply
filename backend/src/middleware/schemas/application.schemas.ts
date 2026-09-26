import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';

// ── Shared field definitions ──────────────────────────────────

const applicationStatusEnum = z.nativeEnum(ApplicationStatus);

const jobIdField = z
  .string({ required_error: 'jobId is required' })
  .min(1, 'jobId cannot be blank');

const resumeIdField = z.string().min(1).optional();

const matchScoreField = z
  .number()
  .int('matchScore must be an integer')
  .min(0, 'matchScore must be ≥ 0')
  .max(100, 'matchScore must be ≤ 100')
  .optional();

const notesField = z
  .string()
  .max(5000, 'notes must be at most 5000 characters')
  .optional();

const appliedAtField = z
  .string()
  .datetime({ message: 'appliedAt must be an ISO-8601 date-time string' })
  .transform((v) => new Date(v))
  .optional();

// ── Create ────────────────────────────────────────────────────

export const createApplicationSchema = z.object({
  jobId:      jobIdField,
  resumeId:   resumeIdField,
  matchScore: matchScoreField,
  notes:      notesField,
  appliedAt:  appliedAtField,
  // status is optional on create; defaults to SAVED in DB
  status: applicationStatusEnum.optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// ── Update ────────────────────────────────────────────────────
// Callers may update status, notes, matchScore, and appliedAt.
// jobId and userId are immutable after creation.

export const updateApplicationSchema = z
  .object({
    status:     applicationStatusEnum.optional(),
    notes:      notesField,
    matchScore: matchScoreField,
    appliedAt:  appliedAtField,
  })
  .refine((data) => Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined).length > 0, {
    message: 'Request body must include at least one field to update',
  });

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

// ── Query params for GET /applications ───────────────────────

export const getApplicationsQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1, 'page must be ≥ 1')),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100, 'limit must be ≤ 100')),

  status: applicationStatusEnum.optional(),

  // Allow filtering by status in query string (e.g. ?status=APPLIED)
  // Note: query params arrive as strings, so we accept it as a string
  // and validate it matches the enum via nativeEnum above.
});

export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>;
