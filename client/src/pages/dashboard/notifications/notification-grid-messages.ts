import type { BookingRequestQueue } from '@shared/booking';

export function emptyMessageForQueue(queue: BookingRequestQueue): string {
  switch (queue) {
    case 'confirmed':
      return 'No confirmed requests yet. Convert a pending request when you add it to the calendar.';
    case 'rejected':
      return 'No rejected requests.';
    case 'followups':
      return 'No requests with a follow-up date. Set one from a pending request’s detail panel.';
    default:
      return 'No pending booking requests.';
  }
}
