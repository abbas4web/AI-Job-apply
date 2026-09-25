import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Zod schema — enforces the exact shape Gemini must return.
// Any field missing or wrong type fails validation and triggers
// a retry before surfacing an error to the caller.
// ─────────────────────────────────────────────────────────────

export const educationEntrySchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  year: z.number().int().optional(),
});

export const resumeAnalysisSchema = z.object({
  summary: z
    .string()
    .min(20, 'Summary too short')
    .describe('2–4 sentence professional overview of the candidate'),

  skills: z
    .array(z.string().min(1))
    .min(1, 'At least one skill required')
    .describe('Distinct professional skills, tools, or methodologies'),

  yearsOfExperience: z
    .number()
    .nonnegative()
    .describe('Total years of professional work experience (0 if unclear)'),

  jobTitles: z
    .array(z.string().min(1))
    .min(1, 'At least one job title required')
    .describe('All job titles held, most recent first'),

  education: z
    .array(educationEntrySchema)
    .describe('Academic qualifications'),

  technologies: z
    .array(z.string().min(1))
    .min(1, 'At least one technology required')
    .describe('Programming languages, frameworks, platforms, and tools'),
});

export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
