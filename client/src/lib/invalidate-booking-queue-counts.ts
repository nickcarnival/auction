import type { QueryClient } from '@tanstack/react-query';

/** Prefix for `useQuery` keys like `['booking-queue-count', 'followups']`. */
export const BOOKING_QUEUE_COUNT_QUERY_KEY_PREFIX = ['booking-queue-count'] as const;

/** Invalidate cached queue counts (e.g. follow-ups tab badge) after list mutations. */
export function invalidateBookingQueueCounts(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: BOOKING_QUEUE_COUNT_QUERY_KEY_PREFIX });
}
