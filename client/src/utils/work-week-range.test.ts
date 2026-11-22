import { describe, it, expect } from 'vitest';
import moment from 'moment';
import { getTenantOperatingWeekdays, getWorkWeekDatesForTenant } from './work-week-range';

describe('getTenantOperatingWeekdays', () => {
  it('dedupes and sorts configured days', () => {
    expect(getTenantOperatingWeekdays([5, 1, 5])).toEqual([1, 5]);
  });

  it('falls back to Mon–Fri when daysOpen is empty', () => {
    expect(getTenantOperatingWeekdays([])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('getWorkWeekDatesForTenant', () => {
  it('returns only daysOpen weekdays in week order', () => {
    const base = moment('2026-03-11').toDate();
    const days = getWorkWeekDatesForTenant(base, [1, 3, 5]);
    expect(days.map(d => moment(d).format('ddd'))).toEqual(['Mon', 'Wed', 'Fri']);
  });

  it('falls back to Mon–Fri when daysOpen is empty', () => {
    const base = moment('2026-03-11').toDate();
    const days = getWorkWeekDatesForTenant(base, []);
    expect(days).toHaveLength(5);
    expect(days.map(d => moment(d).isoWeekday())).toEqual([1, 2, 3, 4, 5]);
  });
});
