import moment from 'moment';
import type { Appointment } from './appointment';
import { FORMAT } from './date-utils';
import type { RecurringScheduleBlock } from './recurring-schedule-block';

/** Synthetic {@link Appointment.status} for expanded recurring schedule blocks on the calendar. */
export const RECURRING_BLOCK_CALENDAR_STATUS = 'RecurringBlock' as const;

export function isRecurringBlockCalendarAppointment(
  appointment: Pick<Appointment, 'status'>
): boolean {
  return appointment.status === RECURRING_BLOCK_CALENDAR_STATUS;
}

type DaysOpenPick = { daysOpen: number[] };

function pushOccurrence(
  day: moment.Moment,
  block: RecurringScheduleBlock,
  resourceId: string,
  schedulableResourceIds: Set<string>,
  out: Appointment[]
): void {
  if (!schedulableResourceIds.has(resourceId)) return;
  const startM = day.clone().hour(block.startHour).minute(0).second(0).millisecond(0);
  const dateKey = day.format('YYYY-MM-DD');
  out.push({
    _id: `recurring:${block.id}:${resourceId}:${dateKey}`,
    customer: block.title,
    notes: block.note ?? '',
    start: startM.format(FORMAT),
    duration: block.durationHours,
    resourceId,
    status: RECURRING_BLOCK_CALENDAR_STATUS,
    phone: null,
    email: null,
    vehicle: '',
    service: '',
    checkedIn: false,
    reminded: false,
    tenantId: '',
    isConfirmed: false,
  });
}

/**
 * Materializes recurring blocks into in-memory calendar rows for [rangeStart, rangeEnd] (inclusive days).
 * Skips days not in `shopHours.daysOpen` and resource ids not in `schedulableResourceIds`.
 */
export function expandRecurringScheduleBlocksForRange(
  blocks: RecurringScheduleBlock[],
  rangeStart: Date,
  rangeEnd: Date,
  shopHours: DaysOpenPick,
  schedulableResourceIds: Set<string>
): Appointment[] {
  if (blocks.length === 0) return [];

  const start = moment(rangeStart).startOf('day');
  const end = moment(rangeEnd).startOf('day');
  const out: Appointment[] = [];

  for (const block of blocks) {
    if (block.interval === 'weekly' && block.dayOfWeek !== undefined) {
      const dow = block.dayOfWeek;
      let d = start.clone();
      while (d.isSameOrBefore(end, 'day')) {
        if (d.day() === dow && shopHours.daysOpen.includes(d.day())) {
          for (const rid of block.resourceIds) {
            pushOccurrence(d, block, rid, schedulableResourceIds, out);
          }
        }
        d = d.clone().add(1, 'day');
      }
      continue;
    }

    if (block.interval === 'monthly' && block.dayOfMonth !== undefined) {
      const dom = block.dayOfMonth;
      let cursor = start.clone().startOf('month');
      const lastMonth = end.clone().startOf('month');
      while (cursor.isSameOrBefore(lastMonth, 'month')) {
        const daysInMonth = cursor.daysInMonth();
        const dayNum = Math.min(dom, daysInMonth);
        const occ = cursor.clone().date(dayNum).startOf('day');
        if (occ.isSameOrBefore(end, 'day') && occ.isSameOrAfter(start, 'day')) {
          if (shopHours.daysOpen.includes(occ.day())) {
            for (const rid of block.resourceIds) {
              pushOccurrence(occ, block, rid, schedulableResourceIds, out);
            }
          }
        }
        cursor = cursor.clone().add(1, 'month');
      }
    }
  }

  return out;
}
