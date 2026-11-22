import { describe, expect, it } from 'vitest';
import { appointmentSchema } from './appointment-schema';

const validBase = {
  customer: 'Jane Doe',
  start: '2026-04-07T14:00:00',
  resourceId: 'tech-1',
  duration: 1,
  phone: '5551234567',
  email: 'jane@example.com',
};

describe('appointmentSchema', () => {
  it('parses a typical API-shaped row', () => {
    const r = appointmentSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.customer).toBe('Jane Doe');
      expect(r.data.notes).toBe('');
      expect(r.data.checkedIn).toBe(false);
    }
  });

  it('rejects short customer name', () => {
    const r = appointmentSchema.safeParse({ ...validBase, customer: 'J' });
    expect(r.success).toBe(false);
  });

  it('rejects missing or too-short resourceId', () => {
    expect(appointmentSchema.safeParse({ ...validBase, resourceId: 'x' }).success).toBe(
      false
    );
  });

  it('rejects duration below 0.5 hours', () => {
    const r = appointmentSchema.safeParse({ ...validBase, duration: 0.25 });
    expect(r.success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const r = appointmentSchema.safeParse({ ...validBase, phone: '123' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email when non-null', () => {
    const r = appointmentSchema.safeParse({ ...validBase, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });
});
