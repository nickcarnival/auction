import { describe, it, expect } from 'vitest';
import { WEAK_PASSWORDS, DISPOSABLE_EMAIL_DOMAINS } from './security';

describe('Security Constants', () => {
  describe('WEAK_PASSWORDS', () => {
    it('should contain common weak passwords', () => {
      expect(WEAK_PASSWORDS).toContain('password');
      expect(WEAK_PASSWORDS).toContain('123456');
      expect(WEAK_PASSWORDS).toContain('qwerty');
      expect(WEAK_PASSWORDS).toContain('admin');
    });

    it('should be an array of strings', () => {
      expect(Array.isArray(WEAK_PASSWORDS)).toBe(true);
      WEAK_PASSWORDS.forEach(password => {
        expect(typeof password).toBe('string');
        expect(password.length).toBeGreaterThan(0);
      });
    });

    it('should have reasonable number of entries', () => {
      expect(WEAK_PASSWORDS.length).toBeGreaterThan(10);
      expect(WEAK_PASSWORDS.length).toBeLessThan(100); // Sanity check
    });

    it('should not contain duplicates', () => {
      const uniquePasswords = new Set(WEAK_PASSWORDS);
      expect(uniquePasswords.size).toBe(WEAK_PASSWORDS.length);
    });

    it('should contain passwords in lowercase', () => {
      WEAK_PASSWORDS.forEach(password => {
        expect(password).toBe(password.toLowerCase());
      });
    });
  });

  describe('DISPOSABLE_EMAIL_DOMAINS', () => {
    it('should contain common disposable email domains', () => {
      expect(DISPOSABLE_EMAIL_DOMAINS).toContain('10minutemail.com');
      expect(DISPOSABLE_EMAIL_DOMAINS).toContain('tempmail.org');
      expect(DISPOSABLE_EMAIL_DOMAINS).toContain('mailinator.com');
    });

    it('should be an array of strings', () => {
      expect(Array.isArray(DISPOSABLE_EMAIL_DOMAINS)).toBe(true);
      DISPOSABLE_EMAIL_DOMAINS.forEach(domain => {
        expect(typeof domain).toBe('string');
        expect(domain.length).toBeGreaterThan(0);
      });
    });

    it('should contain valid domain formats', () => {
      DISPOSABLE_EMAIL_DOMAINS.forEach(domain => {
        expect(domain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
        expect(domain).not.toContain('@');
        expect(domain.startsWith('.')).toBe(false);
        expect(domain.endsWith('.')).toBe(false);
      });
    });

    it('should not contain duplicates', () => {
      const uniqueDomains = new Set(DISPOSABLE_EMAIL_DOMAINS);
      expect(uniqueDomains.size).toBe(DISPOSABLE_EMAIL_DOMAINS.length);
    });

    it('should have reasonable number of entries', () => {
      expect(DISPOSABLE_EMAIL_DOMAINS.length).toBeGreaterThan(3);
      expect(DISPOSABLE_EMAIL_DOMAINS.length).toBeLessThan(50); // Sanity check
    });
  });
});
