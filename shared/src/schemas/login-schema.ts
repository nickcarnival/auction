import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address',
  }),
  /** No length rules on login — those leak policy; the server validates credentials. */
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginFormType = z.infer<typeof loginSchema>;
