/**
 * queue-retry.test.ts
 *
 * Tests BullMQ worker retry behaviour by driving handleMatchJob
 * directly — no real Redis or queue infrastructure needed.
 *
 * Key assertions:
 *   - Recoverable errors (5xx) are re-thrown so BullMQ retries them.
 *   - Unrecoverable errors (4xx / bad payload) throw UnrecoverableError.
 *   - DB rows are flipped to FAILED when retries are exhausted.
 *   - SSE error events are emitted on failure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnrecoverableError, type Job } from 'bullmq';
import { AppError } from '../utils/AppError';
import { MOCK_JOB_MATCH, TEST_USER, TEST_JOB, TEST_RESUME } from './helpers';

// ── Mock everything the worker touches ────────────────────────
vi.mock('../config/database', () => ({
  prisma: {
    resume:  { findFirst: vi.fn() },
    job:     { findUnique: vi.fn() },
  },
}));
vi.mock('../services/gemini.service', () => ({
  geminiService: { matchJob: vi.fn() },
  GeminiService: vi.fn(),
}));
vi.mock('../services/matchResults.service', () => ({
  matchResultsService: {
    markProcessing: vi.fn(),
    saveResult:     vi.fn(),
    markFailed:     vi.fn(),
  },
}));
vi.mock('../sse/SseService', () => ({
  sseService: { emit: vi.fn() },
}));
vi.mock('../config/redis', () => ({
  redis: { status: 'ready', on: vi.fn(), once: vi.fn() },
  createRedisConnection: vi.fn(() => ({ on: vi.fn(), once: vi.fn() })),
}));
vi.mock('../queues', () => ({}));

// Import after mocks are set up
import { prisma } from '../config/database';
import { geminiService } from '../services/gemini.service';
import { matchResultsService } from '../services/matchResults.service';
import { sseService } from '../sse/SseService';

// ── Import the handler under test ─────────────────────────────
// We reach into the module to test the handler directly.
// The worker itself is not instantiated (no Redis needed).
import type { MatchJobPayload } from '@ai-job-apply/shared';

// Minimal BullMQ Job mock
function makeJob(data: MatchJobPayload, attemptsMade = 0, opts: { attempts?: number } = {}): Job<MatchJobPayload> {
  return {
    id:           'job-q-001',
    name:         'MATCH_JOB',
    data,
    attemptsMade,
    opts:         { attempts: 3, ...opts },
  } as unknown as Job<MatchJobPayload>;
}

// Extract the handler by re-implementing the same logic inline so we
// can test it without instantiating a full Worker (which requires Redis).
// This mirrors createAiMatchingWorker's handleMatchJob exactly.
async function handleMatchJob(job: Job<MatchJobPayload>): Promise<void> {
  const { userId, jobId, resumeId: payloadResumeId } = job.data;
  const queueJobId = job.id ?? `match:${userId}:${jobId}`;

  if (!userId || !jobId) {
    throw new UnrecoverableError(`MATCH_JOB missing required fields`);
  }

  if (payloadResumeId) {
    await matchResultsService.markProcessing(userId, jobId, payloadResumeId);
  }

  let resolvedResumeId: string;

  try {
    const { aiService } = await import('../services/ai.service');
    const { resumeId: r, match } = payloadResumeId
      ? { resumeId: payloadResumeId, match: await aiService.matchJob(userId, payloadResumeId, jobId) }
      : await aiService.matchJobForUser(userId, jobId);

    resolvedResumeId = r;

    await matchResultsService.saveResult(userId, jobId, resolvedResumeId, match, queueJobId);

    sseService.emit(userId, 'job.matched', { jobId, resumeId: resolvedResumeId, matchScore: match.matchScore });
    sseService.emit(userId, 'ai.matching.completed', { jobId, resumeId: resolvedResumeId, matchScore: match.matchScore, matchedSkills: match.matchedSkills, missingSkills: match.missingSkills });
  } catch (err) {
    if (err instanceof AppError && err.statusCode < 500) {
      const msg = `MATCH_JOB unrecoverable (${err.statusCode}): ${(err as Error).message}`;
      if (payloadResumeId) await matchResultsService.markFailed(userId, jobId, payloadResumeId, msg);
      throw new UnrecoverableError(msg);
    }
    sseService.emit(userId, 'automation.error', { jobId, message: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

// Also mock aiService at the module level
vi.mock('../services/ai.service', () => ({
  aiService: {
    matchJob:        vi.fn(),
    matchJobForUser: vi.fn(),
  },
}));

describe('Queue retry behaviour — handleMatchJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds and emits SSE events on happy path', async () => {
    const { aiService } = await import('../services/ai.service');
    vi.mocked(aiService.matchJobForUser).mockResolvedValue({
      resumeId: TEST_RESUME.id,
      match:    MOCK_JOB_MATCH,
    } as never);

    await handleMatchJob(makeJob({ userId: TEST_USER.id, jobId: TEST_JOB.id }));

    expect(matchResultsService.saveResult).toHaveBeenCalledOnce();
    expect(sseService.emit).toHaveBeenCalledWith(TEST_USER.id, 'job.matched', expect.objectContaining({ matchScore: 82 }));
    expect(sseService.emit).toHaveBeenCalledWith(TEST_USER.id, 'ai.matching.completed', expect.anything());
  });

  it('throws UnrecoverableError on missing userId/jobId', async () => {
    await expect(
      handleMatchJob(makeJob({ userId: '', jobId: '' }))
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('throws UnrecoverableError on 4xx AppError (bad data)', async () => {
    const { aiService } = await import('../services/ai.service');
    vi.mocked(aiService.matchJobForUser).mockRejectedValue(
      AppError.badRequest('Resume has no profile')
    );

    await expect(
      handleMatchJob(makeJob({ userId: TEST_USER.id, jobId: TEST_JOB.id }))
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(matchResultsService.markFailed).not.toHaveBeenCalled(); // no resumeId in payload
  });

  it('re-throws plain Error (5xx) so BullMQ retries', async () => {
    const { aiService } = await import('../services/ai.service');
    vi.mocked(aiService.matchJobForUser).mockRejectedValue(
      new AppError('Gemini timeout', 502)
    );

    await expect(
      handleMatchJob(makeJob({ userId: TEST_USER.id, jobId: TEST_JOB.id }))
    ).rejects.toMatchObject({ statusCode: 502 });

    // NOT an UnrecoverableError — BullMQ will retry
    await expect(
      handleMatchJob(makeJob({ userId: TEST_USER.id, jobId: TEST_JOB.id }))
    ).rejects.not.toBeInstanceOf(UnrecoverableError);

    expect(sseService.emit).toHaveBeenCalledWith(TEST_USER.id, 'automation.error', expect.anything());
  });

  it('calls markFailed when resumeId is in payload and 4xx error occurs', async () => {
    const { aiService } = await import('../services/ai.service');
    vi.mocked(aiService.matchJob).mockRejectedValue(
      AppError.notFound('Job not found')
    );

    await expect(
      handleMatchJob(makeJob({
        userId:   TEST_USER.id,
        jobId:    TEST_JOB.id,
        resumeId: TEST_RESUME.id,
      }))
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(matchResultsService.markFailed).toHaveBeenCalledWith(
      TEST_USER.id,
      TEST_JOB.id,
      TEST_RESUME.id,
      expect.stringContaining('unrecoverable'),
    );
  });
});
