import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireBillingAccessMiddleware } from './billing-access-middleware';
import { BILLING_ACCESS_DENIED_CODE } from '@shared/tenant';

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('requireBillingAccessMiddleware', () => {
  it('allows global admin without checking tenant', () => {
    const next = vi.fn();
    const req = {
      path: '/appointments/list',
      ctx: { isGlobalAdmin: true, tenant: { trial: false, subscriptionStatus: 'canceled' } },
    } as unknown as Request;
    const res = mockRes();

    requireBillingAccessMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows /users/get-by-token when billing would fail', () => {
    const next = vi.fn();
    const req = {
      path: '/users/get-by-token',
      ctx: {
        isGlobalAdmin: false,
        tenant: {
          trial: false,
          stripeCustomerId: 'cus_x',
          subscriptionStatus: 'unpaid',
        },
      },
    } as unknown as Request;
    const res = mockRes();

    requireBillingAccessMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant lacks billing access', () => {
    const next = vi.fn();
    const req = {
      path: '/customers/list',
      ctx: {
        isGlobalAdmin: false,
        tenant: {
          trial: false,
          stripeCustomerId: 'cus_x',
          subscriptionStatus: 'unpaid',
        },
      },
    } as unknown as Request;
    const res = mockRes();

    requireBillingAccessMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: BILLING_ACCESS_DENIED_CODE })
    );
  });

  it('allows API access during app trial after Stripe unpaid', () => {
    const next = vi.fn();
    const req = {
      path: '/customers/list',
      ctx: {
        isGlobalAdmin: false,
        tenant: {
          trial: false,
          trialEndsAt: new Date(Date.now() + 864e5).toISOString(),
          stripeCustomerId: 'cus_x',
          subscriptionStatus: 'unpaid',
        },
      },
    } as unknown as Request;
    const res = mockRes();

    requireBillingAccessMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
