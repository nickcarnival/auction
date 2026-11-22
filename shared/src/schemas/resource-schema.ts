import * as z from 'zod';

export const resourceSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  color: z.string().optional(),
  email: z.string().email().nullable().or(z.literal('')),
  tenantId: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  /** 0 = Sunday … 6 = Saturday (`Date#getDay()`). Omit or empty = works every weekday. */
  weeklyOffDays: z.preprocess(
    val => (Array.isArray(val) ? val : []),
    z.array(z.number().int().min(0).max(6))
  ).transform(days => [...new Set(days)].sort((a, b) => a - b)),
  /** Integer: lower first. `null` = clear saved order (sort last). Omit/undefined = leave unchanged when merging. */
  order: z.preprocess(
    val => {
      if (val === null) {
        return null;
      }
      if (val === '' || val === undefined) {
        return undefined;
      }
      if (typeof val === 'number' && Number.isNaN(val)) {
        return undefined;
      }
      const n = typeof val === 'string' ? Number.parseInt(val, 10) : Math.trunc(Number(val));
      return Number.isInteger(n) ? n : undefined;
    },
    z
      .union([z.number().int().min(1, { message: 'Sort order must be at least 1.' }), z.null()])
      .optional()
  ),
});

export type ResourceSchemaType = z.infer<typeof resourceSchema>;
