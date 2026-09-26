import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// coverLetterSchema — the exact JSON shape Gemini must return.
//
// subject: email subject line, ready to use as-is.
// body:    full cover letter text, plain prose, no markdown.
//
// STRICT FABRICATION RULES (enforced in the prompt, validated here):
//   - subject must be concise (≤ 150 chars)
//   - body must be substantive but not padded (200–1500 chars)
//   - Gemini is explicitly forbidden from inventing companies,
//     titles, technologies, or achievements not in the profile.
// ─────────────────────────────────────────────────────────────

export const coverLetterSchema = z.object({
  /**
   * Email subject line.
   * Example: "Application for Senior Engineer — Jane Doe"
   */
  subject: z
    .string()
    .min(10, 'subject is too short')
    .max(150, 'subject must be ≤ 150 characters'),

  /**
   * Full cover letter body — plain prose, no markdown, no bullet lists.
   * 3–5 tight paragraphs grounded solely in the provided profile data.
   */
  body: z
    .string()
    .min(200, 'body is too short — must be at least 200 characters')
    .max(3000, 'body is too long — must be ≤ 3000 characters'),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;
