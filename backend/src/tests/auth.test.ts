import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// ── Mock Prisma ────────────────────────────────────────────────
vi.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
  },
}));

// ── Mock Redis / queues so the app can load without a real connection ──
vi.mock('../config/redis', () => ({
  redis:           { status: 'ready', on: vi.fn(), once: vi.fn() },
  connectRedis:    vi.fn(),
  disconnectRedis: vi.fn(),
  createRedisConnection: vi.fn(() => ({ on: vi.fn(), once: vi.fn() })),
}));
vi.mock('../queues', () => ({ jobProcessingQueue: {}, aiMatchingQueue: {}, emailProcessingQueue: {} }));
vi.mock('../sse/SseService', () => ({ sseService: { emit: vi.fn(), broadcast: vi.fn(), addConnection: vi.fn(), removeConnection: vi.fn() } }));

import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { TEST_USER } from './helpers';

const app = createApp();

describe('POST /api/v1/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user and returns a token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id:    TEST_USER.id,
      email: 'new@example.com',
      name:  'New User',
      role:  'USER',
    } as never);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'New User', email: 'new@example.com', password: 'Password1' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('new@example.com');
  });

  it('returns 409 when email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(TEST_USER as never);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dup', email: TEST_USER.email, password: 'Password1' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('validates required fields — returns 400 on missing name', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'x@x.com', password: 'Password1' });

    expect(res.status).toBe(400);
  });

  it('rejects a weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'x@x.com', password: 'alllower1' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns token on valid credentials', async () => {
    const hash = await bcrypt.hash('Password1', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...TEST_USER,
      passwordHash: hash,
    } as never);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: 'Password1' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('returns 401 on wrong password', async () => {
    const hash = await bcrypt.hash('RightPass1', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...TEST_USER,
      passwordHash: hash,
    } as never);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPass1' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
