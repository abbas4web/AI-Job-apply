/**
 * gemini.test.ts
 *
 * Tests GeminiService response validation — specifically that:
 *   1. Valid JSON passing the Zod schema is accepted.
 *   2. Invalid / malformed JSON causes a retry and eventually a 502.
 *   3. Schema violations (wrong types, out-of-range values) are rejected.
 *
 * The Gemini model is fully mocked — no real API calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from '../services/gemini.service';
import { MOCK_JOB_MATCH, MOCK_RESUME_ANALYSIS } from './helpers';

// ── Mock the Gemini SDK ────────────────────────────────────────
const mockGenerateContent = vi.fn();

vi.mock('../config/gemini', () => ({
  getGeminiModel: () => ({ generateContent: mockGenerateContent }),
}));

const svc = new GeminiService();

// Helper: wrap a JSON string in a fake Gemini response object
const geminiResponse = (text: string) => ({
  response: { text: () => text },
});

describe('GeminiService.analyzeResume', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts a valid resume analysis response', async () => {
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(MOCK_RESUME_ANALYSIS)));

    const result = await svc.analyzeResume('Some resume text here that is long enough');
    expect(result.skills).toEqual(MOCK_RESUME_ANALYSIS.skills);
    expect(result.yearsOfExperience).toBe(5);
  });

  it('strips markdown code fences and still parses correctly', async () => {
    const wrapped = '```json\n' + JSON.stringify(MOCK_RESUME_ANALYSIS) + '\n```';
    mockGenerateContent.mockResolvedValue(geminiResponse(wrapped));

    const result = await svc.analyzeResume('Some resume text here that is long enough');
    expect(result.summary).toBe(MOCK_RESUME_ANALYSIS.summary);
  });

  it('throws 502 after all retries when JSON is unparseable', async () => {
    mockGenerateContent.mockResolvedValue(geminiResponse('not valid json at all!!!'));

    await expect(
      svc.analyzeResume('Some resume text here that is long enough')
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 when schema validation fails (missing required field)', async () => {
    const badPayload = { ...MOCK_RESUME_ANALYSIS, skills: 'not-an-array' };
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(badPayload)));

    await expect(
      svc.analyzeResume('Some resume text here that is long enough')
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 when matchScore is out of range (> 100)', async () => {
    const badAnalysis = { ...MOCK_RESUME_ANALYSIS, yearsOfExperience: -1 };
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(badAnalysis)));

    await expect(
      svc.analyzeResume('Some resume text here that is long enough')
    ).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws immediately on empty response', async () => {
    mockGenerateContent.mockResolvedValue(geminiResponse(''));

    await expect(
      svc.analyzeResume('Some resume text here that is long enough')
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});

describe('GeminiService.matchJob', () => {
  beforeEach(() => vi.clearAllMocks());

  const INPUT = {
    resumeProfile: {
      summary: 'Experienced engineer',
      skills: ['Node.js'],
      yearsOfExperience: 5,
      jobTitles: ['Software Engineer'],
      technologies: ['Node.js', 'TypeScript'],
    },
    jobTitle: 'Backend Engineer',
    company: 'Acme',
    jobDescription: 'Build Node.js services',
    requiredSkills: ['Node.js', 'TypeScript'],
    jobLocation: 'Remote',
  };

  it('returns a valid JobMatch when Gemini responds correctly', async () => {
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(MOCK_JOB_MATCH)));

    const result = await svc.matchJob(INPUT);
    expect(result.matchScore).toBe(82);
    expect(result.matchedSkills).toContain('Node.js');
    expect(result.experienceMatch).toBe(true);
  });

  it('rejects matchScore > 100', async () => {
    const bad = { ...MOCK_JOB_MATCH, matchScore: 150 };
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(bad)));

    await expect(svc.matchJob(INPUT)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('rejects matchScore < 0', async () => {
    const bad = { ...MOCK_JOB_MATCH, matchScore: -5 };
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(bad)));

    await expect(svc.matchJob(INPUT)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('rejects non-boolean experienceMatch', async () => {
    const bad = { ...MOCK_JOB_MATCH, experienceMatch: 'yes' };
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(bad)));

    await expect(svc.matchJob(INPUT)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('rejects a too-short reason string', async () => {
    const bad = { ...MOCK_JOB_MATCH, reason: 'short' };
    mockGenerateContent.mockResolvedValue(geminiResponse(JSON.stringify(bad)));

    await expect(svc.matchJob(INPUT)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws 502 after retries on persistent bad JSON', async () => {
    mockGenerateContent.mockResolvedValue(geminiResponse('{broken'));

    await expect(svc.matchJob(INPUT)).rejects.toMatchObject({ statusCode: 502 });
    // Should have retried (MAX_RETRIES + 1 = 3 attempts)
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });
});
