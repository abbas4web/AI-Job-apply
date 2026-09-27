/**
 * matching.test.ts
 *
 * Tests the AI matching HTTP route (POST /api/v1/jobs/:jobId/match)
 * and the underlying AiService.matchJobForUser — Gemini is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { authHeader, TEST_USER, TEST_JOB, TEST_RESUME, TEST_RESUME_PROFILE, MOCK_JOB_MATCH } from './helpers';

vi.mock('../config/database', () => ({
  prisma: {
    resume:  { findFirst: vi.fn() },
    job:     { findUnique: vi.fn() },
  },
}));
vi.mock('../config/redis', () => ({
  redis: { status: 'ready', on: vi.fn(), once: vi.fn() },
  connectRedis: vi.fn(), disconnectRedis: vi.fn(),
  createRedisConnection: vi.fn(() => ({ on: vi.fn(), once: vi.fn() })),
}));
vi.mock('../queues', () => ({ jobProcessingQueue: {}, aiMatchingQueue: {}, emailProcessingQueue: {} }));
vi.mock('../sse/SseService', () => ({ sseService: { emit: vi.fn(), broadcast: vi.fn(), addConnection: vi.fn(), removeConnection: vi.fn() } }));
vi.mock('../services/gemini.service', () => ({
  geminiService: { matchJob: vi.fn(), analyzeResume: vi.fn() },
  GeminiService: vi.fn(),
}));
vi.mock('../queues/producers/aiMatchingProducer', () => ({ enqueueMatchJob: vi.fn() }));

import { prisma } from '../config/database';
import { geminiService } from '../services/gemini.service';

const app = createApp();

describe('POST /api/v1/jobs/:jobId/match', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a match score when resume and job exist', async () => {
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      ...TEST_RESUME,
      profile: TEST_RESUME_PROFILE,
    } as never);
    vi.mocked(prisma.job.findUnique).mockResolvedValue(TEST_JOB as never);
    vi.mocked(geminiService.matchJob).mockResolvedValue(MOCK_JOB_MATCH as never);

    const res = await request(app)
      .post(`/api/v1/jobs/${TEST_JOB.id}/match`)
      .set(authHeader(TEST_USER.id));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.matchScore).toBe(82);
    expect(geminiService.matchJob).toHaveBeenCalledOnce();
  });

  it('returns 404 when user has no resume', async () => {
    vi.mocked(prisma.resume.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/jobs/${TEST_JOB.id}/match`)
      .set(authHeader(TEST_USER.id));

    expect(res.status).toBe(404);
    expect(geminiService.matchJob).not.toHaveBeenCalled();
  });

  it('returns 400 when resume has no analysis profile', async () => {
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      ...TEST_RESUME,
      profile: null,
    } as never);

    const res = await request(app)
      .post(`/api/v1/jobs/${TEST_JOB.id}/match`)
      .set(authHeader(TEST_USER.id));

    expect(res.status).toBe(400);
    expect(geminiService.matchJob).not.toHaveBeenCalled();
  });

  it('returns 404 when the job does not exist', async () => {
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      ...TEST_RESUME,
      profile: TEST_RESUME_PROFILE,
    } as never);
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/jobs/nonexistent-job/match`)
      .set(authHeader(TEST_USER.id));

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(`/api/v1/jobs/${TEST_JOB.id}/match`);
    expect(res.status).toBe(401);
  });
});
