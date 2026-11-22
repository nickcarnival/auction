import { describe, expect, it } from 'vitest';
import { bookingSchema } from './booking-schema';

const validBase = {
  start: new Date('2026-06-15T10:00:00'),
  phone: '5551234567',
};

describe('bookingSchema', () => {
  it('parses minimal booking payload with schema defaults', () => {
    const r = bookingSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.start).toEqual(validBase.start);
      expect(r.data.name.length).toBeGreaterThanOrEqual(2);
      expect(r.data.email).toContain('@');
    }
  });

  it('rejects name shorter than 2 characters when provided', () => {
    const r = bookingSchema.safeParse({ ...validBase, name: 'X' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const r = bookingSchema.safeParse({ ...validBase, phone: '123' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email when provided explicitly', () => {
    const r = bookingSchema.safeParse({ ...validBase, email: 'not-valid' });
    expect(r.success).toBe(false);
  });

  it('rejects model year below minimum', () => {
    const r = bookingSchema.safeParse({ ...validBase, year: 1999 });
    expect(r.success).toBe(false);
  });
});
