import { z } from 'zod';

export const uploadResumeSchema = z.object({
  name: z
    .string()
    .min(1, 'Resume name is required')
    .max(100, 'Name too long')
    .trim(),

  isDefault: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export const updateResumeSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  isDefault: z.boolean().optional(),
});

export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;
