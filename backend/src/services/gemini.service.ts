import { getGeminiModel } from '../config/gemini';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import {
  resumeAnalysisSchema,
  type ResumeAnalysis,
} from './schemas/resumeAnalysis.schema';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const RESUME_MAX_CHARS = 12_000; // ~3 000 tokens — stay well inside context window

// ─────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────

function buildResumeAnalysisPrompt(resumeText: string): string {
  return `You are a professional resume parser. Analyze the resume text below and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

The JSON must conform exactly to this TypeScript type:

{
  "summary": string,           // 2–4 sentence professional overview
  "skills": string[],          // distinct professional skills and methodologies (not technologies)
  "yearsOfExperience": number, // total years of work experience; use 0 if unclear
  "jobTitles": string[],       // all job titles held, most recent first
  "education": Array<{
    "degree": string,          // e.g. "Bachelor of Science"
    "field": string,           // e.g. "Computer Science"
    "institution": string,     // university or school name
    "year": number | undefined // graduation year if present
  }>,
  "technologies": string[]     // programming languages, frameworks, platforms, tools
}

Rules:
- Return ONLY the JSON object. No markdown, no \`\`\`json fences.
- All arrays must have at least one item.
- yearsOfExperience must be a non-negative number.
- Do not invent information not present in the resume.
- If a field has no data, use an empty array [] or 0 as appropriate.

Resume text:
---
${resumeText}
---`;
}

// ─────────────────────────────────────────────────────────────
// JSON extraction helpers
// ─────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences if Gemini wraps the JSON despite instructions.
 * Extracts the first {...} block from the response.
 */
function extractJson(raw: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // Find outermost { } in case there's leading/trailing text
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }

  return stripped.slice(start, end + 1);
}

// ─────────────────────────────────────────────────────────────
// GeminiService
// ─────────────────────────────────────────────────────────────

export class GeminiService {
  /**
   * analyzeResume — sends resume text to Gemini and returns a
   * strictly validated ResumeAnalysis object.
   *
   * Retries up to MAX_RETRIES times on parse/validation failures
   * before throwing a 502 error.
   */
  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    if (!resumeText?.trim()) {
      throw AppError.badRequest('Resume text is empty');
    }

    // Truncate to avoid exceeding context window
    const truncated = resumeText.slice(0, RESUME_MAX_CHARS);
    if (truncated.length < resumeText.length) {
      logger.warn(
        `Resume truncated from ${resumeText.length} to ${RESUME_MAX_CHARS} chars`
      );
    }

    const prompt = buildResumeAnalysisPrompt(truncated);
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        logger.debug(`Gemini analyzeResume attempt ${attempt}`);

        const model = getGeminiModel();
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,      // low temp → deterministic, structured output
            topP: 0.8,
            maxOutputTokens: 1024,
          },
        });

        const rawText = result.response.text();

        if (!rawText?.trim()) {
          throw new Error('Gemini returned an empty response');
        }

        // Extract JSON block from response
        const jsonString = extractJson(rawText);

        // Parse JSON
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonString);
        } catch {
          throw new Error(`JSON.parse failed: ${jsonString.slice(0, 200)}`);
        }

        // Validate shape with Zod
        const validated = resumeAnalysisSchema.safeParse(parsed);

        if (!validated.success) {
          const fieldErrors = JSON.stringify(
            validated.error.flatten().fieldErrors
          );
          throw new Error(`Schema validation failed: ${fieldErrors}`);
        }

        logger.info('Gemini resume analysis succeeded');
        return validated.data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          `Gemini attempt ${attempt}/${MAX_RETRIES + 1} failed: ${lastError.message}`
        );

        // Don't retry on definitive client errors
        if (
          lastError.message.includes('API_KEY_INVALID') ||
          lastError.message.includes('PERMISSION_DENIED')
        ) {
          break;
        }

        // Small back-off before next attempt (longer for 503 overload)
        if (attempt <= MAX_RETRIES) {
          const isOverloaded = lastError.message.includes('503');
          await new Promise((r) => setTimeout(r, isOverloaded ? attempt * 3000 : attempt * 500));
        }
      }
    }

    logger.error('Gemini analyzeResume failed after all retries:', lastError.message);
    throw new AppError(
      'AI analysis failed. Please try again later.',
      502
    );
  }
}

export const geminiService = new GeminiService();
