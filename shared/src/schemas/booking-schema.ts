import * as z from 'zod';
import type { UseFormReturn } from 'react-hook-form';

const today = new Date();

export const bookingSchema = z.object({
  _id: z.string().optional(),
  /** Set when a saved customer is picked in the admin manual-request flow; server resolves customer separately. */
  customerId: z.string().optional(),
  tenantId: z.string().optional().default(''),

  start: z.date(),
  end: z.date().optional(),
  name: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.',
    })
    .default('JOHN TESTER'),

  email: z.string().email().optional().default('johntest@mail.com'),
  phone: z
    .string()
    .min(10, { message: 'Invalid phone number.' })
    .max(15, { message: 'Invalid phone number.' })
    .regex(/^(\+?[0-9]+|(\(?\d{3}\)?[-\s]?)?\d{3}[-\s]?\d{4})$/, {
      message: 'Invalid phone number.',
    }),

  service: z.string().optional().default(''),

  comments: z.string().optional().default(''),

  vehicle: z.string().optional().default(''),
  model: z.string().optional().default(''),
  year: z.coerce
    .number()
    .min(2000)
    .max(today.getFullYear() + 1)
    .default(today.getFullYear()),

  createdDate: z.date().optional(), // Set server-side as new Date()
  updatedDate: z.string().optional(), // Set server-side for updates (still using string format)
});

export type BookingSchemaType = z.infer<typeof bookingSchema>;

export type HookFormType = {
  form: UseFormReturn<BookingSchemaType>;
};
