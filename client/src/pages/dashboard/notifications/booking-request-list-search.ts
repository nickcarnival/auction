import type { BookingRequest } from '@shared/booking';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Lowercased, searchable blob for one request (name, contact, vehicle, notes, follow-up note, etc.). */
function bookingRequestSearchHaystack(n: BookingRequest): string {
  const parts = [
    n.name,
    n.email,
    n.phone,
    digitsOnly(n.phone ?? ''),
    n.vehicle,
    n.service,
    n.comments,
    n.followUpNote,
    n.make,
    n.model,
    n.year,
  ]
    .map(x => (typeof x === 'string' ? x : ''))
    .filter(Boolean);
  return parts.join(' ').toLowerCase();
}

/**
 * Client-side filter for the requests table (matches name, notes, follow-up note, contact, vehicle,
 * service).
 */
export function filterBookingRequestsBySearch(
  rows: BookingRequest[],
  rawQuery: string
): BookingRequest[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length === 0) return rows;
  return rows.filter(n => bookingRequestSearchHaystack(n).includes(q));
}
