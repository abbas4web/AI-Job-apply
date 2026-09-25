import { z } from 'zod';
import { JobSource } from '@prisma/client';

export const runIngestionSchema = z.object({
  /** Which source(s) to ingest. Defaults to all registered sources when omitted. */
  sources: z
    .array(z.nativeEnum(JobSource))
    .min(1, 'Provide at least one source')
    .optional(),

  /** Search query — job title or keywords */
  query: z
    .string({ required_error: 'query is required' })
    .min(1, 'query cannot be empty')
    .max(200, 'query is too long')
    .trim(),

  /** Optional location filter */
  location: z.string().trim().max(200).optional(),

  /** Max jobs to fetch per source (1–100, default 20) */
  limit: z
    .number()
    .int()
    .min(1, 'limit must be ≥ 1')
    .max(100, 'limit must be ≤ 100')
    .default(20),
});

export type RunIngestionInput = z.infer<typeof runIngestionSchema>;
