import { z } from 'zod';

export const recurringScheduleIntervalSchema = z.enum(['weekly', 'monthly']);
export type RecurringScheduleInterval = z.infer<typeof recurringScheduleIntervalSchema>;

const recurringIntervalRefine = (
  val: {
    interval: RecurringScheduleInterval;
    dayOfWeek?: number;
    dayOfMonth?: number;
  },
  ctx: z.RefinementCtx
) => {
  if (val.interval === 'weekly' && val.dayOfWeek === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Choose a day of the week.',
      path: ['dayOfWeek'],
    });
  }
  if (val.interval === 'monthly' && val.dayOfMonth === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Choose a day of the month.',
      path: ['dayOfMonth'],
    });
  }
};

/** Object fields for one recurring block (includes `id` for persisted rows). */
export const recurringScheduleBlockObjectSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  interval: recurringScheduleIntervalSchema,
  /** 0–6 (Sun–Sat) when `interval === 'weekly'`. */
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  /** 1–31 when `interval === 'monthly'`. */
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  /** Start hour 0–23 (same granularity as business hours). */
  startHour: z.number().int().min(0).max(23),
  /** Length in hours; cap to business window in UI. */
  durationHours: z.number().min(0.5).max(24),
  resourceIds: z.array(z.string().min(1)).min(1).max(50),
  /** Optional details for your team (not shown on the public booking page). */
  note: z.string().max(1000).optional(),
});

export const recurringScheduleBlockSchema = recurringScheduleBlockObjectSchema.superRefine(
  recurringIntervalRefine
);

/** Create / edit in UI (`id` assigned on submit when missing). */
export const recurringScheduleBlockFormSchema = recurringScheduleBlockObjectSchema
  .omit({ id: true })
  .extend({ id: z.string().optional() })
  .superRefine(recurringIntervalRefine);

export const recurringScheduleBlocksSchema = z.array(recurringScheduleBlockSchema).max(100);

export type RecurringScheduleBlock = z.infer<typeof recurringScheduleBlockSchema>;

/**
 * Parse, cap count, dedupe by `id` (first wins).
 */
export function normalizeRecurringScheduleBlocks(raw: unknown): RecurringScheduleBlock[] {
  const parsed = recurringScheduleBlocksSchema.safeParse(raw);
  if (!parsed.success) {
    return [];
  }
  const byId = new Map<string, RecurringScheduleBlock>();
  for (const row of parsed.data) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}
