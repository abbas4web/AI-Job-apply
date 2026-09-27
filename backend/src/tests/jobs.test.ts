import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { authHeader, TEST_JOB } from './helpers';
import { AppError } from '../utils/AppError';

vi.mock('../config/database', () => ({
  prisma: {
    job:           { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn() },
    resumeProfile: { findMany: vi.fn() },
  },
}));
vi.mock('../config/redis', () => ({
  redis: { status: 'ready', on: vi.fn(), once: vi.fn() },
  connectRedis: vi.fn(), disconnectRedis: vi.fn(),
  createRedisConnection: vi.fn(() => ({ on: vi.fn(), once: vi.fn() })),
}));
vi.mock('../queues', () => ({ jobProcessingQueue: {}, aiMatchingQueue: {}, emailProcessingQueue: {} }));
vi.mock('../sse/SseService', () => ({ sseService: { emit: vi.fn(), broadcast: vi.fn(), addConnection: vi.fn(), removeConnection: vi.fn() } }));
// Mock the queue producer used inside jobsService.create
vi.mock('../queues/producers/aiMatchingProducer', () => ({ enqueueMatchJob: vi.fn() }));

import { prisma } from '../config/database';

const app = createApp();
const userId = 'user-001';

const VALID_JOB_BODY = {
  title:       'Backend Engineer',
  company:     'Acme',
  location:    'Remote',
  description: 'Build scalable Node.js services for our platform.',
  skills:      ['Node.js', 'TypeScript'],
  source:      'OTHER',
  sourceUrl:   'https://example.com/job/1',
};

describe('POST /api/v1/jobs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a job and returns 201', async () => {
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.job.create).mockResolvedValue(TEST_JOB as never);
    vi.mocked(prisma.resumeProfile.findMany).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(authHeader(userId))
      .send(VALID_JOB_BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(TEST_JOB.title);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set(authHeader(userId))
      .send({ title: 'Missing most fields' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/api/v1/jobs').send(VALID_JOB_BODY);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/jobs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated job list', async () => {
    vi.mocked(prisma.job.count).mockResolvedValue(1);
    vi.mocked(prisma.job.findMany).mockResolvedValue([TEST_JOB] as never);

    const res = await request(app)
      .get('/api/v1/jobs?page=1&limit=20')
      .set(authHeader(userId));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBe(1);
  });

  it('rejects invalid page param', async () => {
    const res = await request(app)
      .get('/api/v1/jobs?page=0')
      .set(authHeader(userId));

    expect(res.status).toBe(400);
  });
});

describe('Duplicate job prevention', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 409 when same source + externalId already exists', async () => {
    // findUnique returns the existing job → jobsService marks it duplicate + throws 409
    vi.mocked(prisma.job.findUnique).mockResolvedValue(TEST_JOB as never);
    vi.mocked(prisma.job.update).mockResolvedValue(TEST_JOB as never);

    const res = await request(app)
      .post('/api/v1/jobs')
      .set(authHeader(userId))
      .send({ ...VALID_JOB_BODY, externalId: TEST_JOB.externalId });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
