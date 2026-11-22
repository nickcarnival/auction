import { z } from 'zod';

/** Public holiday row returned to the client (tenant settings, booking UI). */
export const holidayListItemSchema = z.object({
  _id: z.string(),
  code: z.string(),
  label: z.string(),
  typicalTiming: z.string(),
  sortOrder: z.number(),
  isDefault: z.boolean(),
});

export type HolidayListItem = z.infer<typeof holidayListItemSchema>;

/** Stored on tenant — list of `HolidayListItem.code` values the tenant observes. */
export const observedHolidayIdsSchema = z.array(z.string().min(1).max(64)).max(64);
