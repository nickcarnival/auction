import { describe, expect, it } from 'vitest';
import { normalizeEmailForLookup } from './email-utils';

describe('normalizeEmailForLookup', () => {
  it('returns null for empty input', () => {
    expect(normalizeEmailForLookup(null)).toBeNull();
    expect(normalizeEmailForLookup('')).toBeNull();
    expect(normalizeEmailForLookup('   ')).toBeNull();
  });

  it('lowercases and trims', () => {
    expect(normalizeEmailForLookup('  Jane@Example.COM ')).toBe('jane@example.com');
  });
});
