import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { authHeader, TEST_RESUME, TEST_RESUME_PROFILE, MOCK_RESUME_ANALYSIS } from './helpers';

vi.mock('../config/database', () => ({
  prisma: {
    resume:        { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn(), updateMany: vi.fn() },
    resumeProfile: { upsert: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock('../config/redis', () => ({
  redis: { status: 'ready', on: vi.fn(), once: vi.fn() },
  connectRedis: vi.fn(), disconnectRedis: vi.fn(),
  createRedisConnection: vi.fn(() => ({ on: vi.fn(), once: vi.fn() })),
}));
vi.mock('../queues', () => ({ jobProcessingQueue: {}, aiMatchingQueue: {}, emailProcessingQueue: {} }));
vi.mock('../sse/SseService', () => ({ sseService: { emit: vi.fn(), broadcast: vi.fn(), addConnection: vi.fn(), removeConnection: vi.fn() } }));

// Mock pdf-parse v2 (lazy-required inside extractPdfText)
vi.mock('pdf-parse', () => ({
  PDFParse: class {
    getText() {
      return Promise.resolve({
        pages: [{
          text: 'John Doe Senior Software Engineer five years experience Node.js TypeScript PostgreSQL Redis building scalable REST APIs and microservices',
        }],
      });
    }
  },
}));

// Mock geminiService so no real API calls are made
vi.mock('../services/gemini.service', () => ({
  geminiService: {
    analyzeResume: vi.fn(),
    matchJob:      vi.fn(),
  },
  GeminiService: vi.fn(),
}));

import { prisma } from '../config/database';
import { geminiService } from '../services/gemini.service';

const app = createApp();
const userId = TEST_RESUME.userId;

describe('POST /api/v1/resumes (upload)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads a PDF and returns the created resume', async () => {
    vi.mocked(prisma.resume.count).mockResolvedValue(0);
    vi.mocked(prisma.resume.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.resume.create).mockResolvedValue(TEST_RESUME as never);

    // Create a minimal valid PDF buffer (real content not needed — pdf-parse is mocked)
    const pdfBuffer = Buffer.from('%PDF-1.4 fake pdf content for testing purposes only');

    const res = await request(app)
      .post('/api/v1/resumes')
      .set(authHeader(userId))
      .attach('resume', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('name', 'My Test Resume');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(TEST_RESUME.name);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set(authHeader(userId))
      .field('name', 'No File');

    expect(res.status).toBe(400);
  });

  it('returns 401 without authentication', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 test');
    const res = await request(app)
      .post('/api/v1/resumes')
      .attach('resume', pdfBuffer, { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('name', 'Test');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/resumes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns list of resumes for authenticated user', async () => {
    vi.mocked(prisma.resume.findMany).mockResolvedValue([TEST_RESUME] as never);

    const res = await request(app)
      .get('/api/v1/resumes')
      .set(authHeader(userId));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe(TEST_RESUME.id);
  });
});

describe('POST /api/v1/resumes/:id/analyze', () => {
  beforeEach(() => vi.clearAllMocks());

  it('analyzes a resume and returns the profile', async () => {
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      ...TEST_RESUME,
      content: 'Resume text content here...',
    } as never);
    vi.mocked(geminiService.analyzeResume).mockResolvedValue(MOCK_RESUME_ANALYSIS as never);
    vi.mocked(prisma.resumeProfile.upsert).mockResolvedValue(TEST_RESUME_PROFILE as never);

    const res = await request(app)
      .post(`/api/v1/resumes/${TEST_RESUME.id}/analyze`)
      .set(authHeader(userId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.skills).toEqual(MOCK_RESUME_ANALYSIS.skills);
    // Gemini should have been called (not the real API)
    expect(geminiService.analyzeResume).toHaveBeenCalledOnce();
  });

  it('returns 404 when resume does not belong to user', async () => {
    vi.mocked(prisma.resume.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/v1/resumes/nonexistent/analyze`)
      .set(authHeader(userId));

    expect(res.status).toBe(404);
  });
});
