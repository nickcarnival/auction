import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '@/api/auth/auth-routes';
import { getUserByEmail, getUserByToken, updateUser } from '@/api/user/user-service';
import { compareHash } from '@/api/auth/hashing';
import type { UserAndTenant } from '@shared/user';

vi.mock('@/utils/get-env', () => ({
  getEnv: () => ({
    PORT: 3000,
    JWT_SECRET: 'jwt-test-secret',
    DB_URL: 'mongodb://fake',
    CAPTCHA_SECRET: 'c',
    RESEND_API: 'r',
  }),
}));

const updateOne = vi.fn();
vi.mock('@/db', () => ({
  getDb: vi.fn(async () => ({
    collection: () => ({ updateOne, findOne: vi.fn() }),
  })),
}));

vi.mock('@/api/analytics/record-request-event', () => ({
  scheduleRecordUserEventByIds: vi.fn(),
}));

vi.mock('@/api/user/user-service', () => ({
  getUserByEmail: vi.fn(),
  getUserByToken: vi.fn(),
  updateUser: vi.fn(async u => u),
}));

vi.mock('@/api/auth/hashing', () => ({
  compareHash: vi.fn(),
  createHash: vi.fn(async () => 'hashed'),
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

describe('auth routes', () => {
  beforeEach(() => {
    vi.mocked(getUserByEmail).mockReset();
    vi.mocked(getUserByToken).mockReset();
    vi.mocked(updateUser).mockReset();
    vi.mocked(compareHash).mockReset();
    updateOne.mockReset();
  });

  it('POST /login returns 400 when email or password is missing', async () => {
    const res = await request(createApp()).post('/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LOGIN_FIELDS_REQUIRED');
  });

  it('POST /login returns 400 for invalid email', async () => {
    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_EMAIL');
  });

  it('POST /login returns 401 INVALID_CREDENTIALS when user not found', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /login returns 200 with token when password matches', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      _id: 'u1',
      name: 'U',
      email: 'a@b.com',
      password: 'stored',
      tenantId: '507f1f77bcf86cd799439011',
      active: true,
      failedAttempts: 0,
    });
    vi.mocked(compareHash).mockReturnValue(true);
    vi.mocked(getUserByToken).mockResolvedValue({
      _id: 'u1',
      name: 'U',
      email: 'a@b.com',
      password: '',
      tenantId: '507f1f77bcf86cd799439011',
      tenant: {
        _id: '507f1f77bcf86cd799439011',
        name: 'T',
        tier: 'customer' as const,
      },
    } as UserAndTenant);

    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(10);
    expect(getUserByToken).toHaveBeenCalled();
  });

  it('POST /logout returns 204', async () => {
    const res = await request(createApp()).post('/auth/logout');
    expect(res.status).toBe(204);
  });
});
