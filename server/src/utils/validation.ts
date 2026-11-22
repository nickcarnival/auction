import { WEAK_PASSWORDS, DISPOSABLE_EMAIL_DOMAINS } from '@shared/constants/security';
import sanitizeHtml from 'sanitize-html';

export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  // Check for length limits
  if (email.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }

  const [localPart, domain] = email.split('@');
  if (localPart.length > 64) {
    return { valid: false, error: 'Email address is invalid' };
  }

  // Check for potentially disposable email (warning, not blocking)
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain.toLowerCase())) {
    console.warn(`Potentially disposable email domain used: ${domain}`);
  }

  return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  // Length check
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long (max 128 characters)' };
  }

  // Check for weak passwords
  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common. Please choose a stronger password.' };
  }

  // Password strength checks
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChar].filter(
    Boolean
  ).length;

  if (strengthScore < 3) {
    return {
      valid: false,
      error:
        'Password must contain at least 3 of the following: lowercase letters, uppercase letters, numbers, or special characters',
    };
  }

  return { valid: true };
};

export const validateBusinessName = (businessName: string): { valid: boolean; error?: string } => {
  if (!businessName || typeof businessName !== 'string') {
    return { valid: false, error: 'Business name is required' };
  }

  const trimmed = businessName.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Business name must be at least 2 characters long' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Business name is too long (max 100 characters)' };
  }

  // Check for potentially malicious content
  if (/<script|javascript:|data:|vbscript:|onload=|onerror=/i.test(trimmed)) {
    return { valid: false, error: 'Business name contains invalid characters' };
  }

  // Check for excessive special characters (potential spam/abuse)
  const specialCharCount = (trimmed.match(/[^a-zA-Z0-9\s\-&.,'"]/g) || []).length;
  if (specialCharCount > trimmed.length * 0.3) {
    return { valid: false, error: 'Business name contains too many special characters' };
  }

  return { valid: true };
};

/**
 * Sanitizes a string by removing HTML tags, trimming whitespace, and limiting length
 * Uses sanitize-html library for robust HTML sanitization
 */
export const sanitizeString = (input: unknown): string => {
  if (!input || typeof input !== 'string') return '';

  // Strip all HTML tags, keeping only text content
  let cleaned = sanitizeHtml(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
    disallowedTagsMode: 'discard', // Remove tags completely
  });

  // Trim whitespace and limit length
  return cleaned.trim().substring(0, 1000);
};
