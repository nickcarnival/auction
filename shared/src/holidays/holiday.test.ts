import { describe, it, expect } from 'vitest';
import { holidayListItemSchema, observedHolidayIdsSchema } from './holiday';

describe('holiday schemas', () => {
  it('validates list item', () => {
    const row = {
      _id: '507f1f77bcf86cd799439011',
      code: 'us-christmas',
      label: 'Christmas Day',
      typicalTiming: 'December 25',
      sortOrder: 1,
      isDefault: true,
    };
    expect(holidayListItemSchema.safeParse(row).success).toBe(true);
  });

  it('accepts observed id list', () => {
    expect(observedHolidayIdsSchema.safeParse([]).success).toBe(true);
    expect(
      observedHolidayIdsSchema.safeParse(['us-new-years-day', 'us-christmas']).success
    ).toBe(true);
  });

  it('rejects empty string entries', () => {
    expect(observedHolidayIdsSchema.safeParse(['']).success).toBe(false);
  });
});
