import { z } from 'zod';
import {
  BOOKING_RETURN_VISITOR_STORAGE_VERSION,
  type BookingReturnVisitorPayload,
  bookingReturnVisitorStorageKey,
} from '@shared/booking-return-visitor';

const payloadSchema = z
  .object({
    v: z.literal(BOOKING_RETURN_VISITOR_STORAGE_VERSION),
    tenantId: z.string().min(1),
    bookingRequestId: z.string().regex(/^[a-f0-9]{24}$/i),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    savedAt: z.string().min(1),
    /** Omitted in older stored payloads — treat as empty. */
    vehicle: z.string().optional(),
    /** Legacy keys from a brief earlier format — ignored on read. */
    model: z.string().optional(),
    year: z.number().optional(),
  })
  .transform(
    (r): BookingReturnVisitorPayload => ({
      v: r.v,
      tenantId: r.tenantId,
      bookingRequestId: r.bookingRequestId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      savedAt: r.savedAt,
      vehicle: r.vehicle ?? '',
    })
  );

const OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

/**
 * Parses `POST /api/booking-request/request` JSON (`insertOne` result). `insertedId` may be a hex
 * string or Extended JSON `{ "$oid": "..." }` depending on BSON serialization.
 */
export function extractInsertedIdFromBookingCreateResponse(data: unknown): string | null {
  const obj = z.record(z.unknown()).safeParse(data);
  if (!obj.success) return null;
  const raw = obj.data.insertedId;
  if (typeof raw === 'string' && OBJECT_ID_HEX.test(raw)) return raw.toLowerCase();
  const oidWrap = z.object({ $oid: z.string() }).safeParse(raw);
  if (oidWrap.success && OBJECT_ID_HEX.test(oidWrap.data.$oid)) return oidWrap.data.$oid.toLowerCase();
  return null;
}

export function readBookingReturnVisitor(tenantId: string): BookingReturnVisitorPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(bookingReturnVisitorStorageKey(tenantId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const result = payloadSchema.safeParse(parsed);
    if (!result.success) return null;
    if (result.data.tenantId !== tenantId) return null;
    return result.data;
  } catch {
    return null;
  }
}

export function writeBookingReturnVisitor(payload: BookingReturnVisitorPayload): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(bookingReturnVisitorStorageKey(payload.tenantId), JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore
  }
}
