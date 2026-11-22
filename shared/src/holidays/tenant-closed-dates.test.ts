import { describe, it, expect } from 'vitest';
import {
  normalizeShopClosedDates,
  buildTenantClosedLocalDateSet,
  buildTenantClosedDayMap,
} from './tenant-closed-dates';

describe('tenant-closed-dates', () => {
  it('normalizeShopClosedDates filters invalid rows and dedupes', () => {
    expect(
      normalizeShopClosedDates([
        { date: '2026-03-10', note: 'Race week ' },
        { date: '2026-03-10', note: 'ignored duplicate' },
        { date: '', note: 'bad' },
        { date: 'not-a-date' },
      ])
    ).toEqual([{ date: '2026-03-10', note: 'Race week' }]);
  });

  it('buildTenantClosedLocalDateSet merges federal codes and custom dates', () => {
    const set = buildTenantClosedLocalDateSet(
      ['us-independence-day'],
      [{ date: '2026-08-03', note: 'Shop trip' }],
      [2026]
    );
    expect(set.has('2026-07-04')).toBe(true);
    expect(set.has('2026-08-03')).toBe(true);
  });

  it('buildTenantClosedDayMap lets custom override federal label', () => {
    const map = buildTenantClosedDayMap(
      ['us-independence-day'],
      [{ date: '2026-07-04', note: 'Early close' }],
      [2026]
    );
    expect(map.get('2026-07-04')?.label).toBe('Early close');
  });
});
