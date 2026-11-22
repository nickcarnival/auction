import { z } from 'zod';
import { strongPasswordSchema } from './password-policy';

// Schema for invite-based signup (existing flow)
export const signUpSchema = z.object({
  password: strongPasswordSchema,
});

// Schema for public tenant signup (new flow)
export const publicSignUpSchema = z.object({
  email: z
    .string({
      message: 'Valid email is required',
    })
    .email('Valid email is required'),
  businessName: z
    .string({
      message: 'Business name is required',
    })
    .min(2, 'Business name must be at least 2 characters'),
  password: strongPasswordSchema,
});

export type SignupFormType = z.infer<typeof signUpSchema>;
export type PublicSignupFormType = z.infer<typeof publicSignUpSchema>;
