import { shopHoursSchema } from '@shared/tenant';
import { observedHolidayIdsSchema } from '@shared/holidays/holiday';
import { z } from 'zod';

const shopClosedDateFormRowSchema = z.object({
  date: z.string().max(32),
  note: z.string().max(120).optional(),
});

export const operationsFormSchema = z.object({
  shopHours: shopHoursSchema,
  observedHolidayIds: observedHolidayIdsSchema,
  shopClosedDates: z.array(shopClosedDateFormRowSchema).max(500),
  pendingRequestStaleDays: z.coerce.number().int().min(7).max(365),
});

export type OperationsFormType = z.infer<typeof operationsFormSchema>;

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
}));
