import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// jobMatchSchema — the exact JSON shape Gemini must return.
//
// This schema is the contract between the prompt and the caller.
// Any field missing or wrong type fails validation → retry.
//
// IMPORTANT: matchScore is a pure signal (0–100).
// The backend — not Gemini — decides what to do with it.
// ─────────────────────────────────────────────────────────────

export const jobMatchSchema = z.object({
  /**
   * Overall match quality from 0 (no match) to 100 (perfect match).
   * Weighted blend of skills, experience, and role alignment.
   * Gemini must NOT factor in any application decision here.
   */
  matchScore: z
    .number()
    .int('matchScore must be an integer')
    .min(0, 'matchScore must be ≥ 0')
    .max(100, 'matchScore must be ≤ 100'),

  /** Skills listed in the job that the candidate demonstrably has */
  matchedSkills: z.array(z.string().min(1)),

  /** Skills listed in the job that are absent from the candidate's profile */
  missingSkills: z.array(z.string().min(1)),

  /**
   * True when the candidate's years of experience and seniority level
   * are broadly compatible with what the job describes.
   */
  experienceMatch: z.boolean(),

  /**
   * True when the candidate's location or remote-work preference is
   * compatible with the job's location requirement.
   * Use true when the job is fully remote and the candidate is open to remote work,
   * or when locations are the same / close enough.
   * Use false when unable to determine (treat as conservative / unknown).
   */
  locationMatch: z.boolean(),

  /**
   * 2–4 sentence plain-English explanation of the score.
   * Must be factual and grounded in the resume data — no recommendations,
   * no advice on whether to apply.
   */
  reason: z
    .string()
    .min(20, 'reason is too short')
    .max(1000, 'reason is too long'),
});

export type JobMatch = z.infer<typeof jobMatchSchema>;
