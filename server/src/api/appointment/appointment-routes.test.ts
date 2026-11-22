import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type NextFunction, type Request, type Response } from 'express';
import appointmentRouter from '@/api/appointment/appointment-routes';
import {
  createAppointment,
  getAppointmentsByCustomer,
  updateAppointment,
  remindAppointment,
} from '@/api/appointment/appointment-service';
import { getDb } from '@/db';
import type { Appointment } from '@shared/appointment';
import type { Tenant } from '@shared/tenant';
import type { AuthenticatedRequestContext } from '@/types/request-context';

vi.mock('@/api/appointment/appointment-service', () => ({
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
  remindAppointment: vi.fn(),
  getAppointmentsInRange: vi.fn(),
  getAppointmentsByCustomer: vi.fn(),
}));

vi.mock('@/api/analytics/record-request-event', () => ({
  scheduleRecordUserEvent: vi.fn(),
}));

vi.mock('@/db', () => ({
  getDb: vi.fn(),
}));

const TENANT_ID = '507f1f77bcf86cd799439011';
const APPT_ID = '507f1f77bcf86cd799439012';

const minimalTenant = {
  _id: TENANT_ID,
  name: 'Test Shop',
  tier: 'customer' as const,
} as Tenant;

const baseUser = {
  _id: 'user1',
  name: 'Test',
  email: 't@test.com',
  password: 'x',
  tenantId: TENANT_ID,
  role: 'manager',
  tenant: minimalTenant,
};

function injectCtx(ctx: Partial<AuthenticatedRequestContext> | null) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (ctx) {
      (req as Request & { ctx: AuthenticatedRequestContext }).ctx = ctx as AuthenticatedRequestContext;
    }
    next();
  };
}

function createApp(ctx: Partial<AuthenticatedRequestContext> | null) {
  const app = express();
  app.use(express.json());
  app.use(injectCtx(ctx));
  app.use('/appointments', appointmentRouter);
  return app;
}

describe('appointment routes', () => {
  beforeEach(() => {
    vi.mocked(createAppointment).mockReset();
    vi.mocked(updateAppointment).mockReset();
    vi.mocked(remindAppointment).mockReset();
    vi.mocked(getAppointmentsByCustomer).mockReset();
    vi.mocked(getDb).mockReset();

    vi.mocked(createAppointment).mockResolvedValue(TENANT_ID);
    vi.mocked(updateAppointment).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
      upsertedCount: 0,
      matchedCount: 1,
      upsertedId: null,
    });
    vi.mocked(remindAppointment).mockResolvedValue({ ok: true });
    vi.mocked(getAppointmentsByCustomer).mockResolvedValue([]);
  });

  it('POST /appointments/create returns 401 without user', async () => {
    const res = await request(createApp(null)).post('/appointments/create').send({ customer: 'A' });
    expect(res.status).toBe(401);
    expect(createAppointment).not.toHaveBeenCalled();
  });

  it('POST /appointments/create returns 200 and calls createAppointment', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/create')
      .send({ customer: 'Jane', resourceId: 'r1', start: '2026-01-01' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Added appointment');
    expect(createAppointment).toHaveBeenCalledTimes(1);
  });

  it('POST /appointments/update returns 400 without appointment _id', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/update')
      .send({ customer: 'x' });

    expect(res.status).toBe(400);
    expect(updateAppointment).not.toHaveBeenCalled();
  });

  it('POST /appointments/update returns 401 without tenant id on context', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: '',
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/update')
      .send({ _id: APPT_ID, customer: 'Jane' });

    expect(res.status).toBe(401);
    expect(updateAppointment).not.toHaveBeenCalled();
  });

  it('POST /appointments/update returns 200 and returns service result', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/update')
      .send({ _id: APPT_ID, customer: 'Jane', duration: 1, resourceId: 'r1' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ acknowledged: true });
    expect(updateAppointment).toHaveBeenCalledTimes(1);
  });

  it('POST /appointments/delete returns 400 without _id', async () => {
    const deleteOne = vi.fn();
    vi.mocked(getDb).mockResolvedValue({
      collection: () => ({ deleteOne }),
    } as unknown as Awaited<ReturnType<typeof getDb>>);

    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/delete')
      .send({});

    expect(res.status).toBe(400);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it('POST /appointments/delete returns 200 when delete succeeds', async () => {
    const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
    vi.mocked(getDb).mockResolvedValue({
      collection: () => ({ deleteOne }),
    } as unknown as Awaited<ReturnType<typeof getDb>>);

    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/delete')
      .send({ _id: APPT_ID });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('deleted appointment');
    expect(deleteOne).toHaveBeenCalled();
  });

  it('POST /appointments/nudge returns 400 without appointment id', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/nudge')
      .send({ customer: 'x' });

    expect(res.status).toBe(400);
    expect(remindAppointment).not.toHaveBeenCalled();
  });

  it('POST /appointments/nudge returns 200 when reminder succeeds', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    )
      .post('/appointments/nudge')
      .send({ _id: APPT_ID, email: 'c@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(remindAppointment).toHaveBeenCalledTimes(1);
  });

  it('GET /appointments/get-by-customer returns 400 when customerId missing', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    ).get('/appointments/get-by-customer');

    expect(res.status).toBe(400);
    expect(getAppointmentsByCustomer).not.toHaveBeenCalled();
  });

  it('GET /appointments/get-by-customer returns 401 without tenant', async () => {
    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: '',
        isGlobalAdmin: false,
      })
    ).get('/appointments/get-by-customer?customerId=abc');

    expect(res.status).toBe(401);
    expect(getAppointmentsByCustomer).not.toHaveBeenCalled();
  });

  it('GET /appointments/get-by-customer returns JSON list from service', async () => {
    vi.mocked(getAppointmentsByCustomer).mockResolvedValue([
      { _id: APPT_ID, customer: 'Jane' } as Appointment,
    ]);

    const res = await request(
      createApp({
        user: baseUser,
        tenant: minimalTenant,
        tenantId: TENANT_ID,
        isGlobalAdmin: false,
      })
    ).get('/appointments/get-by-customer?customerId=507f1f77bcf86cd799439099');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(getAppointmentsByCustomer).toHaveBeenCalledTimes(1);
  });
});
