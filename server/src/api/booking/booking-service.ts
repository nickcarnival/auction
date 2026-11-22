import { getDb } from '@/db';
import { ObjectId } from 'mongodb';
import { tenantIdMatchClause } from '@/utils/tenant-db-filter';
import type {
  BookingRequest,
  BookingRequestLinkedAppointment,
  BookingRequestQueue,
} from '@shared/booking';
import { getTenantById } from '@/api/tenant/tenant-service';
import { DEFAULT_PENDING_REQUEST_STALE_DAYS } from '@shared/tenant';
import moment from 'moment';

const COLLECTION = 'booking-request';

/** Cap concatenated follow-up notes to the same max as manual API saves. */
const FOLLOW_UP_NOTE_MAX_LENGTH = 2000;

const MS_PER_DAY = 86_400_000;

const APPOINTMENTS_LOOKUP = {
  $lookup: {
    from: 'appointments',
    let: { bookingRequestId: { $toString: '$_id' } },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ['$bookingRequestId', '$$bookingRequestId'] },
        },
      },
    ],
    as: 'appointments',
  },
} as const;

const LINKED_APPOINTMENTS_MAP = {
  $map: {
    input: '$appointments',
    as: 'a',
    in: {
      _id: { $toString: '$$a._id' },
      start: '$$a.start',
      end: '$$a.end',
      duration: '$$a.duration',
      isConfirmed: { $ifNull: ['$$a.isConfirmed', false] },
      resourceId: {
        $cond: [
          { $eq: [{ $ifNull: ['$$a.resourceId', null] }, null] },
          null,
          { $toString: '$$a.resourceId' },
        ],
      },
    },
  },
} as const;

function toIsoStringFromUnknown(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function readByToHexString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (value instanceof ObjectId) return value.toHexString();
  return undefined;
}

function normalizeLinkedAppointments(raw: unknown): BookingRequestLinkedAppointment[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item): BookingRequestLinkedAppointment => {
    const a = item as Record<string, unknown>;
    return {
      _id: String(a._id ?? ''),
      start: a.start != null ? String(a.start) : undefined,
      end: a.end != null ? String(a.end) : undefined,
      duration: typeof a.duration === 'number' ? a.duration : undefined,
      isConfirmed: Boolean(a.isConfirmed),
      resourceId: a.resourceId != null ? String(a.resourceId) : undefined,
    };
  });
}

function mapBookingRequestDoc(doc: Record<string, unknown> & { _id: ObjectId }): BookingRequest {
  const rest = { ...doc };
  for (const key of Object.keys(rest)) {
    if (key.endsWith('_sortField') || key === 'linkedAppointmentCount' || key === 'readStatusSort') {
      delete rest[key];
    }
  }
  const linkedAppointments = normalizeLinkedAppointments(rest.linkedAppointments);

  const readAtRaw = rest.readAt;
  const readByRaw = rest.readBy;
  const followUpAtRaw = rest.followUpAt;
  const followUpNoteRaw = rest.followUpNote;

  delete rest.readAt;
  delete rest.readBy;
  delete rest.followUpAt;
  delete rest.followUpNote;
  delete rest.lastStaleAutoFollowUpAt;
  delete rest.read;

  const readAt = toIsoStringFromUnknown(readAtRaw);
  const readBy = readByToHexString(readByRaw);
  const followUpAt: string | null =
    followUpAtRaw == null ? null : toIsoStringFromUnknown(followUpAtRaw) ?? null;
  const followUpNote: string | undefined =
    typeof followUpNoteRaw === 'string' && followUpNoteRaw.trim() !== ''
      ? followUpNoteRaw
      : undefined;
  /** API convenience; DB no longer stores `read` (use readAt as source of truth). */
  const read = Boolean(readAt);

  const tenantRaw = rest.tenantId;
  const tenantId =
    tenantRaw instanceof ObjectId
      ? tenantRaw.toHexString()
      : typeof tenantRaw === 'string'
        ? tenantRaw
        : undefined;

  const customerRaw = rest.customerId;
  const customerId =
    customerRaw instanceof ObjectId
      ? customerRaw.toHexString()
      : typeof customerRaw === 'string' && customerRaw.trim() !== ''
        ? customerRaw.trim()
        : undefined;

  delete rest.tenantId;
  delete rest.customerId;
  delete rest.linkedAppointments;

  return {
    ...rest,
    _id: doc._id.toHexString(),
    ...(tenantId !== undefined ? { tenantId } : {}),
    ...(customerId ? { customerId } : {}),
    name: String(rest.name ?? '').toUpperCase(),
    service: String(rest.service ?? '').toUpperCase(),
    vehicle: String((rest.vehicle ?? rest.make ?? '') as string).toUpperCase(),
    linkedAppointments,
    read,
    ...(readAt !== undefined ? { readAt } : {}),
    ...(readBy !== undefined ? { readBy } : {}),
    followUpAt,
    ...(followUpNote !== undefined ? { followUpNote } : {}),
  } as BookingRequest;
}

function confirmedAndLinkedAddFields(extra: Record<string, Record<string, unknown>> = {}): {
  $addFields: Record<string, unknown>;
} {
  return {
    $addFields: {
      isConfirmed: {
        $anyElementTrue: {
          $map: {
            input: '$appointments',
            as: 'appointment',
            in: { $eq: ['$$appointment.isConfirmed', true] },
          },
        },
      },
      linkedAppointmentCount: { $size: { $ifNull: ['$appointments', []] } },
      linkedAppointments: LINKED_APPOINTMENTS_MAP,
      /** 0 = unread (no readAt), 1 = read — replaces legacy `read` field for sort/filter. */
      readStatusSort: {
        $cond: [
          { $eq: [{ $ifNull: ['$readAt', null] }, null] },
          0,
          1,
        ],
      },
      ...extra,
    },
  };
}

function normalizeQueue(raw: string | undefined): BookingRequestQueue {
  if (
    raw === 'confirmed' ||
    raw === 'rejected' ||
    raw === 'pending' ||
    raw === 'followups'
  ) {
    return raw;
  }
  return 'pending';
}

/** Shared queue filters for list + count so badge totals stay aligned with the grid. */
function getBookingRequestQueueMatchAndPostLookupStages(queue: BookingRequestQueue): {
  queueMatch: Record<string, unknown>;
  afterLookupMatchStages: object[];
} {
  const queueMatch =
    queue === 'rejected'
      ? { rejected: true }
      : { $or: [{ rejected: { $exists: false } }, { rejected: false }] };

  const afterLookupMatchStages: object[] = [];
  if (queue === 'confirmed') {
    afterLookupMatchStages.push({ $match: { isConfirmed: true } });
  } else if (queue === 'pending' || queue === 'followups') {
    afterLookupMatchStages.push({ $match: { isConfirmed: { $ne: true } } });
  }
  if (queue === 'followups') {
    afterLookupMatchStages.push({
      $match: { followUpAt: { $exists: true, $ne: null } },
    });
  }
  return { queueMatch, afterLookupMatchStages };
}

function clampPendingStaleDaysFromTenant(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PENDING_REQUEST_STALE_DAYS;
  }
  return Math.min(365, Math.max(7, Math.round(value)));
}

/**
 * One-time auto nudge for pending requests (no confirmed appointment) older than the tenant's
 * threshold: sets follow-up to today, prepends an explanatory staff note, marks unread.
 * Runs when loading pending / unread lists so no separate job is required.
 */
async function applyStalePendingAutoFollowUpForTenant(tenantIdHex: string): Promise<void> {
  const tenant = await getTenantById(tenantIdHex);
  if (!tenant) {
    return;
  }

  const staleDays = clampPendingStaleDaysFromTenant(tenant.pendingRequestStaleDays);
  const cutoff = new Date(Date.now() - staleDays * MS_PER_DAY);

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const queueMatch = { $or: [{ rejected: { $exists: false } }, { rejected: false }] };

  const candidates = await collection
    .aggregate<{ _id: ObjectId; followUpNote?: unknown }>([
      {
        $match: {
          $and: [
            tenantIdMatchClause(tenantIdHex),
            queueMatch,
            { createdDate: { $lt: cutoff } },
            {
              $or: [
                { lastStaleAutoFollowUpAt: { $exists: false } },
                { lastStaleAutoFollowUpAt: null },
              ],
            },
          ],
        },
      },
      APPOINTMENTS_LOOKUP,
      confirmedAndLinkedAddFields(),
      { $unset: 'appointments' },
      { $match: { isConfirmed: { $ne: true } } },
      { $project: { _id: 1, followUpNote: 1 } },
    ])
    .toArray();

  if (candidates.length === 0) {
    return;
  }

  const followUpAt = moment().startOf('day').toDate();
  const autoLine = `Auto: Pending ${staleDays}+ days with no resolution. Please follow up or reject.`;
  const updatedDate = new Date().toLocaleDateString();

  await collection.bulkWrite(
    candidates.map(row => {
      const prev =
        typeof row.followUpNote === 'string' && row.followUpNote.trim()
          ? row.followUpNote.trim()
          : '';
      let note = prev ? `${autoLine}\n\n${prev}` : autoLine;
      if (note.length > FOLLOW_UP_NOTE_MAX_LENGTH) {
        note = note.slice(0, FOLLOW_UP_NOTE_MAX_LENGTH);
      }
      return {
        updateOne: {
          filter: { _id: row._id },
          update: {
            $set: {
              followUpAt,
              followUpNote: note,
              readAt: null,
              readBy: null,
              lastStaleAutoFollowUpAt: new Date(),
              updatedDate,
            },
            $unset: { read: '' },
          },
        },
      };
    })
  );
}

export const getAllBookingRequests = async (
  tenantId: string | undefined,
  sortBy: string = 'createdDate',
  sortOrder: 'asc' | 'desc' = 'desc',
  queue: BookingRequestQueue = 'pending'
): Promise<BookingRequest[] | null> => {
  if (!tenantId) return null;

  if (queue === 'pending' || queue === 'followups') {
    await applyStalePendingAutoFollowUpForTenant(tenantId);
  }

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const { queueMatch, afterLookupMatchStages } = getBookingRequestQueueMatchAndPostLookupStages(queue);

  // Map frontend field names to actual database field names
  const fieldMapping: Record<string, string> = {
    status: 'readStatusSort',
    confirmed: 'isConfirmed', // This will be handled after $addFields
    customer: 'name',
    phone: 'phone',
    email: 'email',
    vehicle: 'make', // DB uses 'make' field, not 'vehicle'
    dropoff: 'start',
    pickup: 'end',
    service: 'service',
    notes: 'comments',
    created: 'createdDate',
    createdDate: 'createdDate',
    updated: 'updatedDate',
    updatedDate: 'updatedDate',
    apps: 'linkedAppointmentCount',
    followUp: 'followUpAt',
    readAt: 'readAt',
  };

  const dbField = fieldMapping[sortBy] || sortBy;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  // String date fields that need special handling (stored as MM/DD/YYYY strings)
  const stringDateFields = ['start', 'end', 'updatedDate'];
  const isStringDateField = stringDateFields.includes(dbField);

  // createdDate is a proper Date object, so it sorts naturally

  const sortKeyExtra = isStringDateField
    ? {
        [`${dbField}_sortField`]: {
          $dateFromString: {
            dateString: `$${dbField}`,
            format: '%m/%d/%Y',
            onError: new Date(0), // Fallback for invalid dates
          },
        },
      }
    : {};

  const docs = await collection
    .aggregate([
      {
        $match: {
          $and: [tenantIdMatchClause(tenantId), queueMatch],
        },
      },
      APPOINTMENTS_LOOKUP,
      confirmedAndLinkedAddFields(sortKeyExtra),
      {
        $unset: 'appointments',
      },
      ...afterLookupMatchStages,
      {
        $sort: {
          [isStringDateField ? `${dbField}_sortField` : dbField]: sortDirection,
        },
      },
    ])
    .toArray();

  return docs.map(d => mapBookingRequestDoc(d as Record<string, unknown> & { _id: ObjectId }));
};

/** Cheap count for a queue tab (same filters as `getAllBookingRequests` for that queue). */
export const countBookingRequestsInQueue = async (
  tenantId: string | undefined,
  queue: BookingRequestQueue
): Promise<number | null> => {
  if (!tenantId) return null;

  if (queue === 'pending' || queue === 'followups') {
    await applyStalePendingAutoFollowUpForTenant(tenantId);
  }

  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const { queueMatch, afterLookupMatchStages } = getBookingRequestQueueMatchAndPostLookupStages(queue);

  const result = await collection
    .aggregate<{ n?: number }>([
      { $match: { $and: [tenantIdMatchClause(tenantId), queueMatch] } },
      APPOINTMENTS_LOOKUP,
      confirmedAndLinkedAddFields(),
      { $unset: 'appointments' },
      ...afterLookupMatchStages,
      { $count: 'n' },
    ])
    .toArray();

  return result[0]?.n ?? 0;
};

export { normalizeQueue };

/** Booking requests linked to a customer (`customerId`), newest first. */
export const getBookingRequestsByCustomer = async (
  customerId: string,
  tenantId: string | undefined
): Promise<BookingRequest[] | null> => {
  if (!tenantId || !customerId || !ObjectId.isValid(customerId)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const customerOid = new ObjectId(customerId);

  const docs = await collection
    .aggregate([
      {
        $match: {
          $and: [
            tenantIdMatchClause(tenantId),
            { $or: [{ customerId: customerOid }, { customerId }] },
          ],
        },
      },
      APPOINTMENTS_LOOKUP,
      confirmedAndLinkedAddFields(),
      {
        $unset: 'appointments',
      },
      {
        $sort: { createdDate: -1 },
      },
    ])
    .toArray();

  return docs.map(d => mapBookingRequestDoc(d as Record<string, unknown> & { _id: ObjectId }));
};

export const getUnreadBookingRequests = async (
  tenantId: string | undefined
): Promise<BookingRequest[] | null> => {
  if (!tenantId) return null;

  await applyStalePendingAutoFollowUpForTenant(tenantId);

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const docs = await collection
    .aggregate([
      {
        $match: {
          $and: [
            tenantIdMatchClause(tenantId),
            {
              $or: [{ rejected: { $exists: false } }, { rejected: false }],
            },
            { $or: [{ readAt: { $exists: false } }, { readAt: null }] },
          ],
        },
      },
      APPOINTMENTS_LOOKUP,
      confirmedAndLinkedAddFields(),
      {
        $unset: 'appointments',
      },
      {
        $match: { isConfirmed: { $ne: true } },
      },
      {
        $sort: { createdDate: -1 },
      },
    ])
    .toArray();

  return docs.map(d => mapBookingRequestDoc(d as Record<string, unknown> & { _id: ObjectId }));
};

/** Clear follow-up on the booking request when the customer commitment is on the calendar (confirmed appt). */
export async function clearFollowUpForBookingRequest(
  tenantIdHex: string,
  bookingRequestId: string | undefined
): Promise<void> {
  if (!bookingRequestId?.trim() || !ObjectId.isValid(bookingRequestId)) {
    return;
  }
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  await collection.updateOne(
    { _id: new ObjectId(bookingRequestId), ...tenantIdMatchClause(tenantIdHex) },
    {
      $set: {
        followUpAt: null,
        updatedDate: new Date().toLocaleDateString(),
      },
    }
  );
}

/**
 * Single booking request with the same computed `linkedAppointments` / `isConfirmed` as list routes.
 * `tenantIdHex` — workspace id (24-char hex); matches ObjectId or legacy string `tenantId` rows.
 */
export const getBookingRequestById = async (
  id: string,
  tenantIdHex: string | undefined
): Promise<BookingRequest | null> => {
  if (!tenantIdHex?.trim() || !id || !ObjectId.isValid(id)) {
    return null;
  }

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const docs = await collection
    .aggregate([
      {
        $match: {
          $and: [{ _id: new ObjectId(id) }, tenantIdMatchClause(tenantIdHex)],
        },
      },
      APPOINTMENTS_LOOKUP,
      confirmedAndLinkedAddFields(),
      {
        $unset: 'appointments',
      },
    ])
    .toArray();

  if (!docs.length) {
    return null;
  }

  return mapBookingRequestDoc(docs[0] as Record<string, unknown> & { _id: ObjectId });
};
