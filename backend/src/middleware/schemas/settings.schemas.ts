import { z } from 'zod';

// ── Shared field definitions ──────────────────────────────────

const stringArrayField = (label: string) =>
  z
    .array(z.string().trim().min(1, `${label} entries cannot be blank`))
    .optional();

// ── Update schema ─────────────────────────────────────────────
// All fields are optional — callers send only what they want to change.

export const updateAutomationSettingsSchema = z
  .object({
    minimumMatchScore: z
      .number()
      .int('minimumMatchScore must be an integer')
      .min(0,   'minimumMatchScore must be ≥ 0')
      .max(100, 'minimumMatchScore must be ≤ 100')
      .optional(),

    preferredJobTitles: stringArrayField('preferredJobTitles'),
    preferredLocations: stringArrayField('preferredLocations'),
    requiredSkills:     stringArrayField('requiredSkills'),
    excludedCompanies:  stringArrayField('excludedCompanies'),

    autoApplyEnabled: z.boolean().optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some((v) => v !== undefined),
    { message: 'Request body must include at least one field to update' },
  );

export type UpdateAutomationSettingsInput = z.infer<
  typeof updateAutomationSettingsSchema
>;
