import { ApiError } from '@/errors/api-error';
import { Router, type Request, type Response } from 'express';
import { getDb } from '../../db';
import type { Appointment } from '@shared/appointment';
import { ObjectId } from 'mongodb';
import {
  createAppointment,
  getAppointmentsInRange,
  remindAppointment,
  updateAppointment,
  getAppointmentsByCustomer,
} from './appointment-service';
import { tenantIdMatchClause } from '@/utils/tenant-db-filter';
import { scheduleRecordUserEvent } from '@/api/analytics/record-request-event';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

const COLLECTION = 'appointments';

const clients = new Map();

router.get('/live-updates', requireAppRole(APP_ROLE.USER), (req, res) => {
  const tenantId = req.ctx?.tenantId;
  if (!tenantId) {
    res.status(401).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!clients.has(tenantId)) {
    clients.set(tenantId, []);
  }

  clients.get(tenantId).push(res);

  req.on('close', () => {
    const tenantClients = clients.get(tenantId);
    if (tenantClients) {
      const index = tenantClients.indexOf(res);
      if (index !== -1) {
        tenantClients.splice(index, 1);
      }
    }
  });
});

const writeUpdate = (tenantId: string) => {
  clients.get(tenantId)?.forEach((client: Response) => {
    client.write('data: {"message": "update"}\n\n');
  });
};

router.get('/get-all', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    const tenantIdHex = req.ctx?.tenantId;
    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    if (req.query?.start && typeof req?.query?.start === 'string') {
      const filteredData = await getAppointmentsInRange({
        tenantIdHex,
        start: new Date(req.query.start),
      });

      return res.json(filteredData);
    }

    const docs = await collection
      .find({
        ...tenantIdMatchClause(tenantIdHex),
      })
      .toArray();

    return res.json(
      docs.map(x => ({
        ...x,
        _id: x._id.toHexString(),
      })) as unknown as Appointment[]
    );
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load appointments').toJSON());
  }
});

type AppointmentParams = Record<string, never>;

router.post(
  '/nudge',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<AppointmentParams, unknown, Appointment>, res: Response) => {
    try {
      const appointment = req.body as Appointment;

      if (!appointment._id || !req.ctx?.tenant?._id) {
        return res
          .status(400)
          .json({
            ok: false,
            ...ApiError.badRequest('MISSING_FIELDS', 'Invalid appointment or tenant').toJSON(),
          });
      }

      const tenantIdHex = req.ctx?.tenantId;
      if (!tenantIdHex) {
        return res.status(401).json({
          ok: false,
          ...ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON(),
        });
      }

      const result = await remindAppointment(req.ctx.tenant, appointment, tenantIdHex);

      if (!result.ok) {
        if (result.reason === 'appointment_not_found') {
          return res.status(404).json({ ok: false, message: 'Appointment not found.' });
        }
        if (result.reason === 'no_appointment_email') {
          return res.status(400).json({
            ok: false,
            message: 'This appointment needs a customer email before you can send a reminder.',
          });
        }
        return res.status(400).json({
          ok: false,
          message:
            'Complete your business name, phone, and business email in Settings → Business before sending reminders.',
          missing: result.missing,
        });
      }

      writeUpdate(tenantIdHex);

      scheduleRecordUserEvent(req, 'appointments.reminder_sent', { category: 'appointments' });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        ok: false,
        message: 'Failed to send reminder.',
      });
    }
  }
);

router.post(
  '/update',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<AppointmentParams, unknown, Appointment>, res: Response) => {
    try {
      if (!req.body._id || !req.ctx?.user) {
        return res.status(400).json({
          message: 'Invalid request',
          ...ApiError.badRequest('MISSING_FIELDS', 'Appointment id and user are required').toJSON(),
        });
      }

      const tenantIdHex = req.ctx?.tenantId;
      if (!tenantIdHex) {
        return res.status(401).json({
          message: 'Unauthorized',
          ...ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON(),
        });
      }

      const updatedApp = await updateAppointment(req.body, req.ctx.user);

      writeUpdate(tenantIdHex);

      scheduleRecordUserEvent(req, 'appointments.updated', { category: 'appointments' });
      res.json(updatedApp);
    } catch (e) {
      console.error(e);
      res.status(500).json({
        message: 'Failed to update',
        ...ApiError.internal('Failed to update appointment').toJSON(),
      });
    }
  }
);

router.post(
  '/create',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<AppointmentParams, unknown, Appointment>, res: Response) => {
    try {
      if (!req.ctx?.user) {
        return res.status(401).json({
          message: 'Unauthorized',
          ...ApiError.unauthorized('MISSING_USER', 'User not found').toJSON(),
        });
      }

      const tenantId = await createAppointment(req.body, req.ctx.user);

      writeUpdate(req.ctx?.tenantId ?? String(tenantId));

      scheduleRecordUserEvent(req, 'appointments.created', { category: 'appointments' });
      res.json({ message: 'Added appointment' });
    } catch (e) {
      console.error(e);
      res.status(500).json({
        message: 'Failed to add appointment',
        ...ApiError.internal('Failed to add appointment').toJSON(),
      });
    }
  }
);

router.post(
  '/delete',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<AppointmentParams, unknown, Appointment>, res: Response) => {
    try {
      const db = await getDb();
      const collection = db.collection(COLLECTION);

      const appointment = req.body;

      if (!appointment._id) {
        return res.status(400).json({
          message: 'Appointment id is required',
          ...ApiError.badRequest('MISSING_APPOINTMENT_ID', 'Appointment id is required').toJSON(),
        });
      }

      const _id: ObjectId = new ObjectId(appointment._id);
      const tenantIdHex = req.ctx?.tenantId;
      if (!tenantIdHex) {
        return res.status(401).json({
          message: 'Unauthorized',
          ...ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON(),
        });
      }

      await collection.deleteOne({
        _id,
        ...tenantIdMatchClause(tenantIdHex),
      });

      writeUpdate(tenantIdHex);

      scheduleRecordUserEvent(req, 'appointments.deleted', { category: 'appointments' });
      res.json({
        message: 'deleted appointment',
      });
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json(ApiError.internal('Failed to delete appointment').toJSON());
    }
  }
);

router.get(
  '/get-by-customer',
  requireAppRole(APP_ROLE.USER),
  async (req: Request, res: Response) => {
    try {
      const { customerId } = req.query;
      const tenantIdHex = req.ctx?.tenantId;

      if (!customerId || typeof customerId !== 'string') {
        return res
          .status(400)
          .json(ApiError.badRequest('MISSING_CUSTOMER_ID', 'customerId is required').toJSON());
      }

      if (!tenantIdHex) {
        return res
          .status(401)
          .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
      }

      const appointments = await getAppointmentsByCustomer(customerId, new ObjectId(tenantIdHex));
      return res.json(appointments);
    } catch (e) {
      console.error(e);
      res.status(500).json(ApiError.internal('Failed to load appointments').toJSON());
    }
  }
);

export default router;
