import { z } from 'zod';
import { JobSource } from '@prisma/client';

// ── Shared field definitions ──────────────────────────────────

const jobSourceEnum = z.nativeEnum(JobSource);

const titleField = z
  .string({ required_error: 'Title is required' })
  .min(2, 'Title must be at least 2 characters')
  .max(200, 'Title must be at most 200 characters')
  .trim();

const companyField = z
  .string({ required_error: 'Company is required' })
  .min(1, 'Company is required')
  .max(200, 'Company must be at most 200 characters')
  .trim();

const locationField = z
  .string({ required_error: 'Location is required' })
  .min(1, 'Location is required')
  .max(200, 'Location must be at most 200 characters')
  .trim();

const descriptionField = z
  .string({ required_error: 'Description is required' })
  .min(10, 'Description must be at least 10 characters')
  .trim();

const skillsField = z
  .array(z.string().trim().min(1))
  .default([]);

const sourceUrlField = z
  .string({ required_error: 'sourceUrl is required' })
  .url('sourceUrl must be a valid URL')
  .max(2048, 'sourceUrl is too long');

const externalIdField = z
  .string()
  .trim()
  .min(1, 'externalId cannot be blank')
  .max(500, 'externalId is too long')
  .optional();

const salaryField = z
  .string()
  .trim()
  .max(200, 'salary must be at most 200 characters')
  .optional();

const postedAtField = z
  .string()
  .datetime({ message: 'postedAt must be an ISO-8601 date-time string' })
  .transform((v) => new Date(v))
  .optional();

// ── Create ────────────────────────────────────────────────────

export const createJobSchema = z.object({
  title:       titleField,
  company:     companyField,
  location:    locationField,
  description: descriptionField,
  skills:      skillsField,
  source:      jobSourceEnum,
  sourceUrl:   sourceUrlField,
  externalId:  externalIdField,
  salary:      salaryField,
  postedAt:    postedAtField,
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// ── Update (all fields optional) ──────────────────────────────

export const updateJobSchema = z
  .object({
    title:       titleField.optional(),
    company:     companyField.optional(),
    location:    locationField.optional(),
    description: descriptionField.optional(),
    skills:      skillsField.optional(),
    source:      jobSourceEnum.optional(),
    sourceUrl:   sourceUrlField.optional(),
    externalId:  externalIdField,
    salary:      salaryField,
    postedAt:    postedAtField,
    isDuplicate: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Request body must include at least one field to update',
  });

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

// ── Query params for GET /jobs ────────────────────────────────

export const getJobsQuerySchema = z.object({
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

  source: jobSourceEnum.optional(),

  search: z.string().trim().max(200).optional(),

  isDuplicate: z
    .string()
    .optional()
    .transform((v) => {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return undefined;
    }),
});

export type GetJobsQuery = z.infer<typeof getJobsQuerySchema>;
