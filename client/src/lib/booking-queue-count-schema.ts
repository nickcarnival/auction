import { z } from 'zod';

export const bookingQueueCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type BookingQueueCountResponse = z.infer<typeof bookingQueueCountResponseSchema>;
