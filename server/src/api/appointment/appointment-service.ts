import { getDb } from '@/db';
import { sendEmail } from '@/email/email-service';
import type { Appointment } from '@shared/appointment';
import type { Resource } from '@shared/resource';
import type { RemindAppointmentResult } from '@shared/customer-reminder';
import {
  REMINDER_EMAIL_FROM,
  buildReminderEmailHtml,
  buildReminderEmailSubject,
  getReminderTenantBlockers,
} from '@shared/customer-reminder';
import type { Tenant } from '@shared/tenant';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { convertStartEnd } from '../convert-date';
import { conditionalCreateCustomer } from '../customer/customer-service';
import { conditionalCreateService } from '../services/services-service';
import type { UserAndTenant } from '@shared/user';
import { tenantIdMatchClause } from '@/utils/tenant-db-filter';
import { normalizeCustomerStoredName } from '@shared/customer-name-utils';
import { clearFollowUpForBookingRequest } from '../booking/booking-service';

const COLLECTION = 'appointments';

type GetAppointmentsInRangeParams = {
  start: Date;
  tenantIdHex: string;
};

export const getAppointmentsInRange = async ({ start, tenantIdHex }: GetAppointmentsInRangeParams) => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const docs = await collection
    .find({
      ...tenantIdMatchClause(tenantIdHex),
      $expr: {
        $and: [
          {
            $gte: [
              { $dateFromString: { dateString: '$start' } },
              moment(start).subtract(30, 'days').toDate(),
            ],
          },
          {
            $lte: [
              { $dateFromString: { dateString: '$start' } },
              moment(start).add(30, 'days').toDate(),
            ],
          },
        ],
      },
    })
    .toArray();

  return docs.map(x => ({
    ...x,
    _id: x._id.toHexString(),
  })) as unknown as Appointment[];
};

export const remindAppointment = async (
  tenant: Tenant,
  appointment: Appointment,
  tenantIdHex: string
): Promise<RemindAppointmentResult> => {
  const missing = getReminderTenantBlockers(tenant);
  if (missing.length > 0) {
    console.error('CANNOT REMIND APPOINTMENT — TENANT FIELDS INCOMPLETE', missing, appointment._id);
    return { ok: false, reason: 'tenant_incomplete', missing };
  }

  if (!appointment._id?.trim()) {
    return { ok: false, reason: 'appointment_not_found' };
  }

  const db = await getDb();
  const collection = db.collection('appointments');

  const _id: ObjectId = new ObjectId(appointment._id);

  const existing = await collection.findOne({
    _id,
    ...tenantIdMatchClause(tenantIdHex),
  });

  if (!existing) {
    return { ok: false, reason: 'appointment_not_found' };
  }

  const emailRaw = existing.email;
  const email = typeof emailRaw === 'string' ? emailRaw.trim() : '';
  if (!email) {
    console.error('CANNOT REMIND APPOINTMENT WITHOUT EMAIL', appointment._id);
    return { ok: false, reason: 'no_appointment_email' };
  }

  const customerName =
    typeof existing.customer === 'string' ? existing.customer : String(appointment.customer ?? '');
  const startForEmail =
    existing.start != null && existing.start !== '' ? existing.start : appointment.start;

  await sendEmail({
    to: [email],
    from: REMINDER_EMAIL_FROM,
    subject: buildReminderEmailSubject(tenant.name ?? ''),
    html: buildReminderEmailHtml({
      shopName: tenant.name ?? '',
      customerName,
      dropOffLabel: moment(startForEmail).toDate().toLocaleString(),
      shopPhone: tenant.phone ?? '',
    }),
  });

  await collection.updateOne(
    { _id: existing._id, ...tenantIdMatchClause(tenantIdHex) },
    { $set: { reminded: true, updatedDate: new Date().toLocaleDateString() } }
  );

  return { ok: true };
};

export const createAppointment = async (
  _appointment: Appointment,
  user: UserAndTenant
): Promise<string> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const appointment = convertStartEnd(_appointment);

  await conditionalCreateService(appointment.service);

  const tenantId = user?.tenantId;
  const tenantIdStr = tenantId?.toString();
  if (!tenantIdStr) {
    throw new Error('tenant_required');
  }

  const customer = await conditionalCreateCustomer(appointment, tenantIdStr);
  if (!customer?._id) {
    throw new Error('customer_required');
  }

  const customerOid = new ObjectId(customer._id);
  const customerDisplayName =
    typeof customer.name === 'string' && customer.name.trim()
      ? customer.name
      : normalizeCustomerStoredName(appointment.customer);

  const isConfirmed = appointment.checkedIn ? true : (appointment.isConfirmed ?? false);

  await collection.insertOne({
    ...appointment,
    customer: customerDisplayName,
    customerId: customerOid,
    duration: appointment.duration ?? 0.5,
    tenantId,
    bookingRequestId: appointment.bookingRequestId,
    isConfirmed,
    updatedDate: new Date().toLocaleDateString(),
    createdDate: new Date().toLocaleDateString(),
    createdBy: user?._id?.toString(),
    _id: undefined,
  });

  if (isConfirmed && appointment.bookingRequestId?.trim()) {
    await clearFollowUpForBookingRequest(tenantIdStr, appointment.bookingRequestId);
  }

  return tenantId?.toString();
};

export const updateAppointment = async (_appointment: Appointment, user: UserAndTenant) => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const appointment = convertStartEnd(_appointment);

  if (!appointment._id) {
    throw new Error('JUST MESSED UP');
  }

  const _id: ObjectId = new ObjectId(appointment._id);

  await conditionalCreateService(appointment.service);
  const tenantId = user?.tenantId;
  const tenantIdStr = tenantId?.toString();
  if (!tenantIdStr) {
    throw new Error('tenant_required');
  }

  const customer = await conditionalCreateCustomer(appointment, tenantIdStr);
  if (!customer?._id) {
    throw new Error('customer_required');
  }

  const customerOid = new ObjectId(customer._id);
  const customerDisplayName =
    typeof customer.name === 'string' && customer.name.trim()
      ? customer.name
      : normalizeCustomerStoredName(appointment.customer);

  const isConfirmed = appointment.checkedIn ? true : (appointment.isConfirmed ?? false);

  const updatedApp = await collection.updateOne(
    { _id, ...tenantIdMatchClause(tenantIdStr) },
    {
      $set: {
        customer: customerDisplayName,
        status: appointment.status,
        customerId: customerOid,
        notes: appointment.notes,
        email: appointment.email,
        phone: appointment.phone,
        start: appointment.start,
        vehicle: appointment.vehicle,
        duration: appointment.duration ?? 0.5,
        resourceId: appointment.resourceId,
        service: appointment.service,
        end: appointment.end,
        checkedIn: !!appointment.checkedIn,
        bookingRequestId: appointment.bookingRequestId,
        isConfirmed,
        updatedBy: user?.email,
        updatedDate: new Date().toLocaleDateString(),
        reminded: !!appointment.reminded,
      },
    }
  );

  if (isConfirmed && appointment.bookingRequestId?.trim()) {
    await clearFollowUpForBookingRequest(tenantIdStr, appointment.bookingRequestId);
  }

  return updatedApp;
};

function resourceIdToHex(resourceId: unknown): string | null {
  if (resourceId == null) return null;
  if (typeof resourceId === 'string' && ObjectId.isValid(resourceId)) return resourceId;
  if (resourceId instanceof ObjectId) return resourceId.toHexString();
  if (typeof resourceId === 'object' && resourceId !== null && '$oid' in resourceId) {
    const o = (resourceId as { $oid?: string }).$oid;
    return typeof o === 'string' && ObjectId.isValid(o) ? o : null;
  }
  return null;
}

export const getAppointmentsByCustomer = async (customerId: string, tenantId: ObjectId) => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const tenantHex = tenantId.toHexString();

  const docs = await collection
    .find({
      customerId: new ObjectId(customerId),
      $or: [{ tenantId }, { tenantId: tenantHex }],
    })
    .sort({ start: -1 }) // Sort by start date, most recent first
    .toArray();

  const resourceIdsHex = new Set<string>();
  for (const d of docs) {
    const rh = resourceIdToHex(d.resourceId);
    if (rh) resourceIdsHex.add(rh);
  }

  const resourceByHex = new Map<string, Resource>();
  if (resourceIdsHex.size > 0) {
    const resCol = db.collection('resources');
    const oids = [...resourceIdsHex].map(h => new ObjectId(h));
    const resDocs = await resCol
      .find({
        _id: { $in: oids },
        $or: [{ tenantId }, { tenantId: tenantHex }],
      })
      .toArray();
    for (const r of resDocs) {
      const doc = r as Record<string, unknown> & { _id: ObjectId; name?: string };
      resourceByHex.set(r._id.toHexString(), {
        _id: r._id.toHexString(),
        name: typeof doc.name === 'string' ? doc.name : '',
        ...(typeof doc.color === 'string' ? { color: doc.color } : {}),
      });
    }
  }

  return docs.map(x => {
    const ridHex = resourceIdToHex(x.resourceId);
    const fromId = ridHex ? resourceByHex.get(ridHex) : undefined;
    const embedded = x.resource as Resource | undefined;
    const resource =
      fromId ??
      (embedded && typeof embedded.name === 'string' ? embedded : undefined);

    const out: Record<string, unknown> = {
      ...x,
      _id: x._id.toHexString(),
    };
    delete out.resource;
    if (resource) out.resource = resource;
    return out;
  }) as unknown as Appointment[];
};

function csvBooleanYesNo(v: unknown): string {
  return v === true ? 'yes' : v === false ? 'no' : '';
}

export type AppointmentCsvRow = {
  id: string;
  customer: string;
  customerId: string;
  start: string;
  end: string;
  duration: string;
  status: string;
  service: string;
  vehicle: string;
  phone: string;
  email: string;
  notes: string;
  resourceId: string;
  checkedIn: string;
  isConfirmed: string;
};

/** All appointments for tenant (ObjectId or string `tenantId` in legacy docs). For CSV export. */
export const getAppointmentsForCsvExport = async (
  tenantIdStr: string
): Promise<AppointmentCsvRow[]> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const oid = new ObjectId(tenantIdStr);
  const hex = oid.toHexString();

  const docs = await collection
    .find({ $or: [{ tenantId: oid }, { tenantId: hex }] })
    .sort({ start: 1 })
    .toArray();

  return docs.map(doc => {
    const d = doc as Record<string, unknown> & { _id: ObjectId };
    return {
      id: d._id.toHexString(),
      customer: d.customer != null ? String(d.customer) : '',
      customerId:
        d.customerId != null
          ? typeof d.customerId === 'object' && d.customerId != null && 'toHexString' in d.customerId
            ? (d.customerId as ObjectId).toHexString()
            : String(d.customerId)
          : '',
      start: d.start != null ? String(d.start) : '',
      end: d.end != null ? String(d.end) : '',
      duration: typeof d.duration === 'number' ? String(d.duration) : '',
      status: d.status != null ? String(d.status) : '',
      service: d.service != null ? String(d.service) : '',
      vehicle: d.vehicle != null ? String(d.vehicle) : '',
      phone: d.phone != null ? String(d.phone) : '',
      email: d.email != null ? String(d.email) : '',
      notes: d.notes != null ? String(d.notes) : '',
      resourceId:
        d.resourceId != null
          ? typeof d.resourceId === 'object' && d.resourceId != null && 'toHexString' in d.resourceId
            ? (d.resourceId as ObjectId).toHexString()
            : String(d.resourceId)
          : '',
      checkedIn: csvBooleanYesNo(d.checkedIn),
      isConfirmed: csvBooleanYesNo(d.isConfirmed),
    };
  });
};
