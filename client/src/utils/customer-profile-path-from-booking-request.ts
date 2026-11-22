import type { BookingRequest } from '@shared/booking';

/**
 * Navigate to the customer profile: direct detail when `customerId` exists,
 * otherwise search the list by request name (legacy rows without `customerId`).
 */
export function customerProfilePathFromBookingRequest(
  req: Pick<BookingRequest, 'customerId' | 'name'>
): string {
  const cid = typeof req.customerId === 'string' ? req.customerId.trim() : '';
  if (cid) {
    return `/dashboard/customers/${encodeURIComponent(cid)}`;
  }
  const name = typeof req.name === 'string' ? req.name.trim() : '';
  if (name) {
    return `/dashboard/customers?search=${encodeURIComponent(name)}`;
  }
  return '/dashboard/customers';
}
