import { z } from 'zod';
import { WEAK_PASSWORDS } from '../constants/security';

/**
 * Password rules aligned with server `validatePassword` (signup, invite completion, reset).
 */
export const strongPasswordSchema = z
  .string({ message: 'Password is required' })
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(128, { message: 'Password is too long (max 128 characters)' })
  .refine(
    password => !WEAK_PASSWORDS.includes(password.toLowerCase()),
    'Password is too common. Please choose a stronger password.'
  )
  .refine(password => {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const strengthScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChar].filter(Boolean)
      .length;
    return strengthScore >= 3;
  }, 'Password must contain at least 3 of: lowercase, uppercase, numbers, special characters');
