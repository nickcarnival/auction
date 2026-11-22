import * as z from 'zod';

export const userSchema = z.object({
  _id: z.string().optional(),
  tenantId: z.string().optional().default(''),

  name: z
    .string()
    .min(2, {
      message: 'Name must be at least 2 characters.',
    })
    .default('JOHN TESTER'),

  email: z.string().email().optional().default('johntest@mail.com'),
  active: z.boolean().optional().default(false),
});

export type UserSchemaType = z.infer<typeof userSchema>;
