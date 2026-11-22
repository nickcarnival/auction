import { z } from 'zod';
import { strongPasswordSchema } from './password-policy';

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export const resetPasswordFormSchema = z.object({
  token: z.string().min(1, { message: 'Reset link is invalid or expired' }),
  password: strongPasswordSchema,
});

export type ForgotPasswordFormType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormType = z.infer<typeof resetPasswordFormSchema>;
