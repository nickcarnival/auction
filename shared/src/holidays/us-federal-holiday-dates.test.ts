import { describe, it, expect } from 'vitest';
import { getUsFederalHolidayDateKey } from './us-federal-holiday-dates';

describe('getUsFederalHolidayDateKey', () => {
  it('matches known federal dates for 2024', () => {
    expect(getUsFederalHolidayDateKey('us-new-years-day', 2024)).toBe('2024-01-01');
    expect(getUsFederalHolidayDateKey('us-martin-luther-king-jr', 2024)).toBe('2024-01-15');
    expect(getUsFederalHolidayDateKey('us-memorial-day', 2024)).toBe('2024-05-27');
    expect(getUsFederalHolidayDateKey('us-thanksgiving', 2024)).toBe('2024-11-28');
    expect(getUsFederalHolidayDateKey('us-christmas', 2024)).toBe('2024-12-25');
  });

  it('returns null for unknown code', () => {
    expect(getUsFederalHolidayDateKey('not-a-holiday', 2024)).toBe(null);
  });
});
