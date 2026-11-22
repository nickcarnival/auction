import { describe, expect, it } from 'vitest';
import { normalizePhoneForLookup } from './phone-utils';

describe('normalizePhoneForLookup', () => {
  it('returns null for empty input', () => {
    expect(normalizePhoneForLookup(null)).toBeNull();
    expect(normalizePhoneForLookup('')).toBeNull();
    expect(normalizePhoneForLookup(undefined)).toBeNull();
  });

  it('strips punctuation and spaces', () => {
    expect(normalizePhoneForLookup('(555) 123-4567')).toBe('5551234567');
  });

  it('collapses NANP with leading country code 1', () => {
    expect(normalizePhoneForLookup('+1 555 123 4567')).toBe('5551234567');
  });

  it('preserves 10-digit US numbers', () => {
    expect(normalizePhoneForLookup('5551234567')).toBe('5551234567');
  });
});
