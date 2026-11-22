import { describe, expect, it } from 'vitest';
import {
  normalizeRecurringScheduleBlocks,
  recurringScheduleBlockSchema,
  recurringScheduleBlocksSchema,
  type RecurringScheduleBlock,
} from './recurring-schedule-block';

const minimalValid: RecurringScheduleBlock = {
  id: 'x1',
  title: 'Block',
  interval: 'weekly',
  dayOfWeek: 2,
  startHour: 9,
  durationHours: 1,
  resourceIds: ['r1'],
};

describe('normalizeRecurringScheduleBlocks', () => {
  it('returns empty array for non-array or failed parse', () => {
    expect(normalizeRecurringScheduleBlocks(undefined)).toEqual([]);
    expect(normalizeRecurringScheduleBlocks(null)).toEqual([]);
    expect(normalizeRecurringScheduleBlocks({})).toEqual([]);
    expect(normalizeRecurringScheduleBlocks([{ id: '' }])).toEqual([]);
  });

  it('returns deduped valid blocks (first occurrence retains row)', () => {
    const a: RecurringScheduleBlock = {
      ...minimalValid,
      id: 'dup',
      title: 'First',
    };
    const b: RecurringScheduleBlock = {
      ...minimalValid,
      id: 'dup',
      title: 'Second',
    };
    const out = normalizeRecurringScheduleBlocks([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('First');
  });

  it('rejects entire payload when one row is invalid (strict array)', () => {
    expect(
      normalizeRecurringScheduleBlocks([
        minimalValid,
        { ...minimalValid, id: 'y', interval: 'monthly' as const },
      ])
    ).toEqual([]);
  });

  it('returns [] when list exceeds max length (fails top-level array parse)', () => {
    const row = { ...minimalValid, id: 'overflow' };
    const tooMany = Array.from({ length: 101 }, (_, i) => ({
      ...row,
      id: `b${i}`,
    }));
    expect(normalizeRecurringScheduleBlocks(tooMany)).toEqual([]);
    expect(recurringScheduleBlocksSchema.safeParse(tooMany).success).toBe(false);
  });
});

describe('recurringScheduleBlockSchema', () => {
  it('accepts valid weekly and monthly shapes', () => {
    const weekly = recurringScheduleBlockSchema.safeParse(minimalValid);
    expect(weekly.success).toBe(true);

    const monthly = recurringScheduleBlockSchema.safeParse({
      id: 'm1',
      title: 'Monthly',
      interval: 'monthly',
      dayOfMonth: 5,
      startHour: 11,
      durationHours: 1.5,
      resourceIds: ['r1'],
    });
    expect(monthly.success).toBe(true);
  });

  it('rejects weekly row without dayOfWeek', () => {
    const monthly = recurringScheduleBlockSchema.safeParse({
      id: 'w1',
      title: 'Bad',
      interval: 'weekly',
      startHour: 9,
      durationHours: 1,
      resourceIds: ['r1'],
    });
    expect(monthly.success).toBe(false);
    if (!monthly.success) {
      expect(monthly.error.flatten().fieldErrors.dayOfWeek?.length).toBeGreaterThan(0);
    }
  });

  it('rejects monthly row without dayOfMonth', () => {
    const monthly = recurringScheduleBlockSchema.safeParse({
      id: 'm1',
      title: 'Bad',
      interval: 'monthly',
      startHour: 9,
      durationHours: 1,
      resourceIds: ['r1'],
    });
    expect(monthly.success).toBe(false);
    if (!monthly.success) {
      expect(monthly.error.flatten().fieldErrors.dayOfMonth?.length).toBeGreaterThan(0);
    }
  });
});
