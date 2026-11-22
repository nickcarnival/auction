/**
 * Security constants for validation and password checking
 */

// Common weak passwords to reject
export const WEAK_PASSWORDS: string[] = [
  'password',
  '123456',
  '123456789',
  'qwerty',
  'abc123',
  'password123',
  '12345678',
  '111111',
  '123123',
  'welcome',
  'admin',
  'letmein',
  'monkey',
  '1234567890',
  'password1',
  'qwerty123',
  'welcome123',
];

// Common disposable email domains to potentially flag
export const DISPOSABLE_EMAIL_DOMAINS: string[] = [
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org',
  'throwaway.email',
];
