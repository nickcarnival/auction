import moment from 'moment';

/**
 * Weekdays the tenant is open (`0 = Sun` … `6 = Sat`), sorted.
 * Matches work-week behavior: empty `daysOpen` ⇒ Mon–Fri.
 */
export function getTenantOperatingWeekdays(daysOpen: number[]): number[] {
  if (daysOpen.length > 0) {
    return [...new Set(daysOpen)].sort((a, b) => a - b);
  }
  return [1, 2, 3, 4, 5];
}

/**
 * Open work days for the week that contains `baseDate`, in chronological order.
 *
 * Uses the same rules as the schedule’s work-week view: `daysOpen` is 0=Sun … 6=Sat;
 * if none match, falls back to Mon–Fri.
 *
 * Kept in one place so placement ghost date↔column mapping stays aligned with `CustomWorkWeek`.
 */
export function getWorkWeekDatesForTenant(baseDate: Date, daysOpen: number[]): Date[] {
  const d = moment(baseDate).startOf('day');
  const dayOfWeek = d.day();
  const startOfWeek = d.clone().subtract(dayOfWeek, 'day');
  const workDays: Date[] = [];

  for (const dayIndex of getTenantOperatingWeekdays(daysOpen)) {
    workDays.push(startOfWeek.clone().add(dayIndex, 'day').toDate());
  }
  return workDays;
}
