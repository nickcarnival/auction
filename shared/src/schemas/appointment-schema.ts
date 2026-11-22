import * as z from 'zod';
import type { UseFormReturn } from 'react-hook-form';

export const appointmentSchema = z.object({
  _id: z.string().optional(),
  /** Set when the appointment is linked to a customers row (from API or picking a saved customer). */
  customerId: z.string().optional(),
  customer: z.string().min(2, {
    message: 'Customer must be at least 2 characters.',
  }),
  end: z.union([z.date(), z.string()]).optional(),
  start: z.union([z.date(), z.string()]),
  resourceId: z.string().min(2, {
    message: 'Please select a technician.',
  }),
  duration: z.coerce.number().min(0.5, {
    message: 'Duration must be at least 0.5 hours (30 minutes).',
  }),
  notes: z.string().optional().default(''),
  phone: z
    .string()
    .min(10, { message: 'Invalid phone number.' })
    .max(15, { message: 'Invalid phone number.' })
    .regex(/^(\+?[0-9]+|(\(?\d{3}\)?[-\s]?)?\d{3}[-\s]?\d{4})$/, {
      message: 'Invalid phone number.',
    })
    .nullable()
    .default(null),
  email: z.string().email().nullable().default(null),
  vehicle: z.string().optional().default(''),
  service: z.string().optional().default(''),
  checkedIn: z.boolean().optional().default(false),
  status: z.string().optional().default(''),
  reminded: z.boolean().optional().default(false),
  tenantId: z.string().optional().default(''),
  bookingRequestId: z.string().nullable().optional(),
  isConfirmed: z.boolean().optional().default(false),
});

export type AppointmentSchemaType = z.infer<typeof appointmentSchema>;

export type HookFormType = {
  form: UseFormReturn<AppointmentSchemaType>;
};
