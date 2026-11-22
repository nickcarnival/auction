import { describe, expect, it } from 'vitest';
import moment from 'moment';
import {
  expandRecurringScheduleBlocksForRange,
  isRecurringBlockCalendarAppointment,
  RECURRING_BLOCK_CALENDAR_STATUS,
} from './recurring-schedule-block-calendar';
import type { RecurringScheduleBlock } from './recurring-schedule-block';

describe('expandRecurringScheduleBlocksForRange', () => {
  it('returns no rows for empty block list', () => {
    expect(
      expandRecurringScheduleBlocksForRange(
        [],
        moment('2026-04-01').toDate(),
        moment('2026-04-30').toDate(),
        { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
        new Set(['t1'])
      )
    ).toEqual([]);
  });

  it('returns no rows when range end is before range start', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'X',
      interval: 'weekly',
      dayOfWeek: 2,
      startHour: 9,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-04-12').toDate(),
      moment('2026-04-06').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(out).toHaveLength(0);
  });

  it('copies block note into appointment notes', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'Title',
      note: 'Internal note',
      interval: 'weekly',
      dayOfWeek: 4,
      startHour: 10,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-04-08').toDate(),
      moment('2026-04-09').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.notes).toBe('Internal note');
  });

  it('creates weekly rows for each matching day in range', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'Biweekly Tue',
      interval: 'weekly',
      dayOfWeek: 2,
      startHour: 9,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-04-06').toDate(),
      moment('2026-04-19').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    const dates = [...new Set(out.map((r) => moment(r.start).format('YYYY-MM-DD')))].sort();
    expect(dates).toEqual(['2026-04-07', '2026-04-14']);
  });

  it('emits one monthly occurrence per month in range when day is in range', () => {
    const block: RecurringScheduleBlock = {
      id: 'm1',
      title: 'Ides',
      interval: 'monthly',
      dayOfMonth: 10,
      startHour: 8,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-01-15').toDate(),
      moment('2026-03-20').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    const dates = out.map((r) => moment(r.start).format('YYYY-MM-DD')).sort();
    expect(dates).toEqual(['2026-02-10', '2026-03-10']);
  });

  it('merges weekly and monthly blocks in one expansion pass', () => {
    const weekly: RecurringScheduleBlock = {
      id: 'w',
      title: 'W',
      interval: 'weekly',
      dayOfWeek: 1,
      startHour: 9,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const monthly: RecurringScheduleBlock = {
      id: 'm',
      title: 'M',
      interval: 'monthly',
      dayOfMonth: 15,
      startHour: 12,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [weekly, monthly],
      moment('2026-04-06').toDate(),
      moment('2026-04-20').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(out.length).toBeGreaterThanOrEqual(2);
    const titles = new Set(out.map((r) => r.customer));
    expect(titles.has('W')).toBe(true);
    expect(titles.has('M')).toBe(true);
  });

  it('creates weekly rows on matching weekdays for schedulable resources', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'Team sync',
      interval: 'weekly',
      dayOfWeek: 2,
      startHour: 9,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const rangeStart = moment('2026-04-06').toDate();
    const rangeEnd = moment('2026-04-12').toDate();
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      rangeStart,
      rangeEnd,
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(out.length).toBe(1);
    expect(out[0]?.status).toBe(RECURRING_BLOCK_CALENDAR_STATUS);
    expect(out[0]?.resourceId).toBe('t1');
    expect(moment(out[0]?.start).day()).toBe(2);
    expect(out[0]?.customer).toBe('Team sync');
  });

  it('skips resources not in schedulable set', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'X',
      interval: 'weekly',
      dayOfWeek: 1,
      startHour: 10,
      durationHours: 0.5,
      resourceIds: ['gone'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-04-06').toDate(),
      moment('2026-04-12').toDate(),
      { daysOpen: [1, 2, 3, 4, 5] },
      new Set(['t1'])
    );
    expect(out.length).toBe(0);
  });

  it('skips weekly occurrences when that weekday is not in daysOpen', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'Closed Monday block',
      interval: 'weekly',
      dayOfWeek: 1,
      startHour: 8,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-04-06').toDate(),
      moment('2026-04-12').toDate(),
      { daysOpen: [0, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(out.length).toBe(0);
  });

  it('creates one row per schedulable resource on the same day', () => {
    const block: RecurringScheduleBlock = {
      id: 'b1',
      title: 'All techs',
      interval: 'weekly',
      dayOfWeek: 3,
      startHour: 14,
      durationHours: 2,
      resourceIds: ['a', 'b'],
    };
    const wed = moment('2026-04-08');
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      wed.clone().startOf('isoWeek').toDate(),
      wed.clone().endOf('isoWeek').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['a', 'b'])
    );
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.resourceId).sort()).toEqual(['a', 'b']);
    expect(out[0]?.start).toBe(out[1]?.start);
  });

  it('clamps monthly day-of-month past the end of short months', () => {
    const block: RecurringScheduleBlock = {
      id: 'm1',
      title: 'Month end',
      interval: 'monthly',
      dayOfMonth: 31,
      startHour: 7,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-02-01').toDate(),
      moment('2026-02-28').toDate(),
      { daysOpen: [0, 1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(out).toHaveLength(1);
    expect(moment(out[0]?.start).format('YYYY-MM-DD')).toBe('2026-02-28');
  });

  it('skips monthly occurrences on closed shop days', () => {
    const block: RecurringScheduleBlock = {
      id: 'm2',
      title: 'Closed Sunday',
      interval: 'monthly',
      dayOfMonth: 15,
      startHour: 9,
      durationHours: 1,
      resourceIds: ['t1'],
    };
    const out = expandRecurringScheduleBlocksForRange(
      [block],
      moment('2026-02-01').toDate(),
      moment('2026-02-28').toDate(),
      { daysOpen: [1, 2, 3, 4, 5, 6] },
      new Set(['t1'])
    );
    expect(moment('2026-02-15').day()).toBe(0);
    expect(out.length).toBe(0);
  });
});

describe('isRecurringBlockCalendarAppointment', () => {
  it('returns true only for RecurringBlock synthetic status', () => {
    expect(isRecurringBlockCalendarAppointment({ status: RECURRING_BLOCK_CALENDAR_STATUS })).toBe(
      true
    );
    expect(isRecurringBlockCalendarAppointment({ status: 'Booked' })).toBe(false);
    expect(isRecurringBlockCalendarAppointment({ status: 'Completed' })).toBe(false);
  });
});
