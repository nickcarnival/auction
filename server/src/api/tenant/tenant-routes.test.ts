import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type NextFunction, type Request, type Response } from 'express';
import tenantRouter from '@/api/tenant/tenant-routes';
import { updateTenant } from '@/api/tenant/tenant-service';
import { ADMIN_ROLE } from '@shared/global-admin-role';
import type { Tenant } from '@shared/tenant';
import type { AuthenticatedRequestContext } from '@/types/request-context';

vi.mock('@/api/tenant/tenant-service', () => ({
  getTenantById: vi.fn(),
  updateTenant: vi.fn(),
  createTenant: vi.fn(),
  deleteTenant: vi.fn(),
  approveTenant: vi.fn(),
}));

const TENANT_ID = '507f1f77bcf86cd799439011';

function injectCtx(ctx: Partial<AuthenticatedRequestContext> | null) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (ctx) {
      (req as Request & { ctx: AuthenticatedRequestContext }).ctx = ctx as AuthenticatedRequestContext;
    }
    next();
  };
}

const baseUser = {
  _id: 'user1',
  name: 'Test',
  email: 't@test.com',
  password: 'x',
  tenantId: TENANT_ID,
  role: 'manager',
  tenant: {} as Tenant,
};

function createApp(ctx: Partial<AuthenticatedRequestContext> | null) {
  const app = express();
  app.use(express.json());
  app.use(injectCtx(ctx));
  app.use('/tenants', tenantRouter);
  return app;
}

describe('tenant routes', () => {
  beforeEach(() => {
    vi.mocked(updateTenant).mockReset();
    vi.mocked(updateTenant).mockResolvedValue(null);
  });

  it('POST /tenants/update returns 400 when _id is missing', async () => {
    const res = await request(createApp({
      user: baseUser,
      tenantId: TENANT_ID,
      tenant: {} as Tenant,
      isGlobalAdmin: false,
    }))
      .post('/tenants/update')
      .send({ shopName: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Tenant id required');
    expect(updateTenant).not.toHaveBeenCalled();
  });

  it('POST /tenants/update returns 401 when user is absent', async () => {
    const res = await request(createApp(null))
      .post('/tenants/update')
      .send({ _id: TENANT_ID });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
    expect(updateTenant).not.toHaveBeenCalled();
  });

  it('POST /tenants/update returns 401 when caller is neither admin nor same tenant', async () => {
    const res = await request(
      createApp({
        user: { ...baseUser, tenantId: '507f1f77bcf86cd799439099' },
        tenantId: '507f1f77bcf86cd799439099',
        tenant: {} as Tenant,
        isGlobalAdmin: false,
      })
    )
      .post('/tenants/update')
      .send({ _id: TENANT_ID, shopName: 'y' });

    expect(res.status).toBe(401);
    expect(updateTenant).not.toHaveBeenCalled();
  });

  it('POST /tenants/update returns 200 and calls updateTenant when tenant matches user', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenantId: TENANT_ID,
        tenant: {} as Tenant,
        isGlobalAdmin: false,
      })
    )
      .post('/tenants/update')
      .send({ _id: TENANT_ID, shopName: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Updated tenant');
    expect(updateTenant).toHaveBeenCalledTimes(1);
    expect(updateTenant).toHaveBeenCalledWith(
      expect.objectContaining({ _id: TENANT_ID, shopName: 'Updated' })
    );
  });

  it('POST /tenants/update allows global admin to update another tenant id', async () => {
    const otherId = '507f1f77bcf86cd799439022';
    const res = await request(
      createApp({
        user: { ...baseUser, role: ADMIN_ROLE },
        tenantId: TENANT_ID,
        tenant: {} as Tenant,
        isGlobalAdmin: true,
      })
    )
      .post('/tenants/update')
      .send({ _id: otherId, shopName: 'Admin edit' });

    expect(res.status).toBe(200);
    expect(updateTenant).toHaveBeenCalledWith(
      expect.objectContaining({ _id: otherId, shopName: 'Admin edit' })
    );
  });
});
