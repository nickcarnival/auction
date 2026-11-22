import type { BookingRequest, BookingRequestQueue } from '@shared/booking';
import moment from 'moment';

function isFollowUpInEffect(n: BookingRequest, queue: BookingRequestQueue): boolean {
  return (
    (queue === 'pending' || queue === 'followups') && !n.rejected && !n.isConfirmed
  );
}

/** Whether follow-up is before today (local calendar day). */
export function isFollowUpOverdue(
  n: BookingRequest,
  requestQueue: BookingRequestQueue
): boolean {
  if (!isFollowUpInEffect(n, requestQueue) || n.followUpAt == null || n.followUpAt === '') {
    return false;
  }
  return moment(n.followUpAt).isBefore(moment(), 'day');
}

/** Whether follow-up is scheduled for the current local day (not overdue, not future-only). */
export function isFollowUpDueToday(
  n: BookingRequest,
  requestQueue: BookingRequestQueue
): boolean {
  if (!isFollowUpInEffect(n, requestQueue) || n.followUpAt == null || n.followUpAt === '') {
    return false;
  }
  return moment(n.followUpAt).isSame(moment(), 'day');
}

export type FollowUpUrgency = 'overdue' | 'today' | 'none';

export function getFollowUpUrgency(
  n: BookingRequest,
  requestQueue: BookingRequestQueue
): FollowUpUrgency {
  if (isFollowUpOverdue(n, requestQueue)) {
    return 'overdue';
  }
  if (isFollowUpDueToday(n, requestQueue)) {
    return 'today';
  }
  return 'none';
}

export function formatFollowUpTableDate(n: BookingRequest): string {
  if (n.followUpAt == null || n.followUpAt === '') {
    return '—';
  }
  return moment(n.followUpAt).format('MM/DD/YYYY');
}
