import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { authHeader, TEST_USER, TEST_JOB } from './helpers';

vi.mock('../config/database', () => ({
  prisma: {
    application: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    job:         { findUnique: vi.fn() },
    resume:      { findFirst: vi.fn() },
  },
}));
vi.mock('../config/redis', () => ({
  redis: { status: 'ready', on: vi.fn(), once: vi.fn() },
  connectRedis: vi.fn(), disconnectRedis: vi.fn(),
  createRedisConnection: vi.fn(() => ({ on: vi.fn(), once: vi.fn() })),
}));
vi.mock('../queues', () => ({ jobProcessingQueue: {}, aiMatchingQueue: {}, emailProcessingQueue: {} }));
vi.mock('../sse/SseService', () => ({ sseService: { emit: vi.fn(), broadcast: vi.fn(), addConnection: vi.fn(), removeConnection: vi.fn() } }));

import { prisma } from '../config/database';
import { sseService } from '../sse/SseService';

const app = createApp();
const userId = TEST_USER.id;

const TEST_APP = {
  id:        'app-001',
  userId,
  jobId:     TEST_JOB.id,
  resumeId:  null,
  status:    'SAVED',
  matchScore: null,
  notes:     null,
  appliedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/v1/applications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an application and emits SSE event', async () => {
    vi.mocked(prisma.application.findUnique).mockResolvedValue(null); // no duplicate
    vi.mocked(prisma.job.findUnique).mockResolvedValue({ id: TEST_JOB.id } as never); // job exists
    vi.mocked(prisma.application.create).mockResolvedValue(TEST_APP as never);

    const res = await request(app)
      .post('/api/v1/applications')
      .set(authHeader(userId))
      .send({ jobId: TEST_JOB.id });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(TEST_APP.id);
    // SSE event must be emitted
    expect(sseService.emit).toHaveBeenCalledWith(userId, 'application.created', {
      applicationId: TEST_APP.id,
      jobId: TEST_JOB.id,
    });
  });

  it('returns 400 when jobId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set(authHeader(userId))
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .send({ jobId: TEST_JOB.id });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/applications', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns applications for the authenticated user', async () => {
    vi.mocked(prisma.application.count).mockResolvedValue(1);
    vi.mocked(prisma.application.findMany).mockResolvedValue([TEST_APP] as never);

    const res = await request(app)
      .get('/api/v1/applications')
      .set(authHeader(userId));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe(TEST_APP.id);
  });
});

describe('PATCH /api/v1/applications/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates application status', async () => {
    const updated = { ...TEST_APP, status: 'APPLIED' };
    vi.mocked(prisma.application.findFirst).mockResolvedValue(TEST_APP as never);
    vi.mocked(prisma.application.update).mockResolvedValue(updated as never);

    const res = await request(app)
      .patch(`/api/v1/applications/${TEST_APP.id}`)
      .set(authHeader(userId))
      .send({ status: 'APPLIED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPLIED');
  });

  it('returns 404 when application does not belong to user', async () => {
    vi.mocked(prisma.application.findFirst).mockResolvedValue(null);

    const res = await request(app)
      .patch(`/api/v1/applications/nonexistent`)
      .set(authHeader(userId))
      .send({ status: 'APPLIED' });

    expect(res.status).toBe(404);
  });
});
