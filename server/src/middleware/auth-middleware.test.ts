import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { authenticateMiddleware } from './auth-middleware';
import { getUserByToken } from '@/api/user/user-service';
import type { UserAndTenant } from '@shared/user';

vi.mock('@/utils/get-env', () => ({
  getEnv: () => ({ JWT_SECRET: 'test-secret' }),
}));

vi.mock('@/api/user/user-service', () => ({
  getUserByToken: vi.fn(),
}));

const TENANT_ID = '507f1f77bcf86cd799439011';

function mockResponse(): Response {
  const r = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return r as unknown as Response;
}

describe('authenticateMiddleware', () => {
  beforeEach(() => {
    vi.mocked(getUserByToken).mockReset();
  });

  it('returns 401 with code when auth cookie is missing', async () => {
    const req = { cookies: {} } as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;
    await authenticateMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_REQUIRED' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403, clears cookie when JWT is invalid', async () => {
    const req = { cookies: { 'auth-token': 'not-a-jwt' } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;
    await authenticateMiddleware(req, res, next);
    expect(res.clearCookie).toHaveBeenCalledWith('auth-token');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_TOKEN_INVALID' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user no longer exists', async () => {
    const token = jwt.sign({ _id: 'u1', email: 'a@b.c' }, 'test-secret');
    vi.mocked(getUserByToken).mockResolvedValue(null);
    const req = { cookies: { 'auth-token': token } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;
    await authenticateMiddleware(req, res, next);
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AUTH_SESSION_INVALID' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets ctx when session is valid', async () => {
    const token = jwt.sign({ _id: 'u1', email: 'a@b.c' }, 'test-secret');
    const user = {
      _id: 'u1',
      name: 'A',
      email: 'a@b.c',
      password: 'x',
      tenantId: TENANT_ID,
      tenant: {
        name: 'T',
        tier: 'customer' as const,
        _id: TENANT_ID,
      },
    } as UserAndTenant;
    vi.mocked(getUserByToken).mockResolvedValue(user);
    const req = { cookies: { 'auth-token': token } } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;
    await authenticateMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.ctx?.tenantId).toBe(TENANT_ID);
    expect(req.ctx?.user.email).toBe('a@b.c');
  });
});
