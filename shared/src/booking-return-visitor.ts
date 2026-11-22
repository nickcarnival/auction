export const BOOKING_RETURN_VISITOR_STORAGE_VERSION = 1 as const;

/** Stored in `localStorage` after a successful public booking request (one entry per tenant). */
export type BookingReturnVisitorPayload = {
  v: typeof BOOKING_RETURN_VISITOR_STORAGE_VERSION;
  tenantId: string;
  /** Hex id of the booking-request row (`insertOne.insertedId`). */
  bookingRequestId: string;
  name: string;
  email: string;
  phone: string;
  /** Single bike line from the booking form (`vehicle` — year + model text). */
  vehicle: string;
  /** ISO 8601 timestamp when saved */
  savedAt: string;
};

export function bookingReturnVisitorStorageKey(tenantId: string): string {
  return `plandry.bookingReturnVisitor.v${BOOKING_RETURN_VISITOR_STORAGE_VERSION}:${tenantId}`;
}
