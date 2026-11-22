import * as z from 'zod';

/** Single-line email field: empty or valid `z.string().email()` after trim. */
export const customerEmailInputSchema = z
  .string()
  .max(320)
  .refine(
    s => {
      const t = s.trim();
      return t === '' || z.string().email().safeParse(t).success;
    },
    { message: 'Enter a valid email or leave blank.' }
  );

/** Editable customer profile fields (tenant dashboard). */
export const customerProfileFieldsSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).max(500),
  email: customerEmailInputSchema,
  phone: z.string().max(40),
});

export const customerUpdateRequestSchema = customerProfileFieldsSchema.extend({
  customerId: z.string().min(1),
});

export type CustomerProfileFields = z.infer<typeof customerProfileFieldsSchema>;
export type CustomerUpdateRequest = z.infer<typeof customerUpdateRequestSchema>;
