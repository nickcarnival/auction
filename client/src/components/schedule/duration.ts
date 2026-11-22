import { Appointment } from '@shared/appointment';
import type { Resource } from '@shared/resource';
import { roundDuration } from '@shared/date-utils';
import {
  type ShopHours,
  isShopOpen,
  getNextShopOpen,
  getShopCloseForDay,
  isShopOpenDay,
  DEFAULT_SHOP_HOURS,
} from '@shared/shop-hours';
import moment from 'moment';

/** Matches `step` on react-big-calendar TimeGrid (minutes). */
export const CALENDAR_SLOT_STEP_MINUTES = 30;

/**
 * Snaps a local time to the calendar grid (e.g. :00, :30 when step is 30).
 */
export function snapMomentToCalendarStep(
  d: Date | moment.Moment,
  stepMinutes: number = CALENDAR_SLOT_STEP_MINUTES
): moment.Moment {
  const m = moment(d);
  const dayStart = m.clone().startOf('day');
  const minutesFromMidnight = m.diff(dayStart, 'minutes');
  const snapped = Math.round(minutesFromMidnight / stepMinutes) * stepMinutes;
  return dayStart.clone().add(snapped, 'minutes').second(0).millisecond(0);
}

/** Resolve recurring tech days-off for calendar math (spillover / duration). */
export function technicianWeeklyOffDaysForAppointment(
  appointment: Pick<Appointment, 'resourceId' | 'resource'>,
  resources?: Resource[]
): number[] | undefined {
  const embedded = appointment.resource?.weeklyOffDays;
  if (embedded != null && embedded.length > 0) {
    return embedded;
  }
  const id = appointment.resourceId?.trim();
  if (!id || !resources?.length) {
    return undefined;
  }
  const match = resources.find(r => r._id === id);
  const w = match?.weeklyOffDays;
  return w != null && w.length > 0 ? w : undefined;
}

type GetEndDateParams = {
  start?: string;
  duration?: number;
  shopHours?: ShopHours;
  /** Weekdays (`Date#getDay`) this technician never works; spillover skips them like closed shop days. */
  technicianWeeklyOffDays?: number[] | null;
};

type GetStartDateParams = {
  start?: string;
  initialStart?: string | Date;
  shopHours?: ShopHours;
};

export const SHOP_HOURS = 9;
export const SHOP_OPEN = 9;
export const SHOP_CLOSE = 18;

export const SHOP_START_DAY = 1;
export const SHOP_CLOSE_DAY = 2;

// Legacy constants - kept for backward compatibility
// const SHOP_WEEK_START = 1;
// const SHOP_WEEK_END = 5;

export const getStartHours = ({
  start,
  initialStart,
  shopHours = DEFAULT_SHOP_HOURS,
}: GetStartDateParams): number => {
  if (!start) return shopHours.openHour;
  if (!initialStart) return shopHours.openHour;

  const startDate = moment(start).toDate();
  const initialStartDate = moment(initialStart).toDate();

  // If the shop is open at the initial start time, use that hour
  if (isShopOpen(initialStartDate, shopHours)) {
    return moment(initialStart).hours();
  }

  // Otherwise, find the next shop opening time and return its hour
  const nextOpen = getNextShopOpen(startDate, shopHours);
  return moment(nextOpen).hours();
};

export const movePastWeekend = (
  d: moment.Moment,
  shopHours: ShopHours = DEFAULT_SHOP_HOURS
): boolean => {
  let moved = false;

  // Keep moving forward until we find a shop open day (weekly schedule only)
  while (!isShopOpenDay(d.day(), shopHours)) {
    d.add(1, 'days');
    moved = true;
  }

  return moved;
};

const MAX_DAY_ADVANCE = 21;

/**
 * Advance `d` until the calendar day is both a shop operating day and (if given) not a technician
 * recurring day off. Used for multi-day “business hours” end times.
 */
export const movePastNonWorkingDays = (
  d: moment.Moment,
  shopHours: ShopHours = DEFAULT_SHOP_HOURS,
  technicianWeeklyOffDays?: number[] | null
): boolean => {
  const off =
    technicianWeeklyOffDays != null && technicianWeeklyOffDays.length > 0
      ? new Set(technicianWeeklyOffDays)
      : null;
  let moved = false;
  let guard = 0;
  while (guard < MAX_DAY_ADVANCE) {
    guard += 1;
    const dow = d.day();
    const shopClosed = !isShopOpenDay(dow, shopHours);
    const techOff = off?.has(dow) ?? false;
    if (!shopClosed && !techOff) {
      break;
    }
    d.add(1, 'days');
    moved = true;
  }
  return moved;
};

export const getEndDate = ({
  start,
  duration,
  shopHours = DEFAULT_SHOP_HOURS,
  technicianWeeklyOffDays = null,
}: GetEndDateParams): Date => {
  if (!start) return moment().toDate();
  if (!duration) return moment(start).add(30, 'minutes').toDate();

  const startDate = moment(start).toDate();
  const shopCloseToday = getShopCloseForDay(startDate, shopHours);

  // If shop is closed on this day, move to next open day
  if (!shopCloseToday) {
    const anchor = moment(getNextShopOpen(startDate, shopHours));
    movePastNonWorkingDays(anchor, shopHours, technicianWeeklyOffDays);
    return anchor.add(duration, 'hours').toDate();
  }

  const startPlusDuration = moment(start).add(duration, 'hours');

  // If the appointment fits within today's hours, return it
  if (startPlusDuration.isSameOrBefore(shopCloseToday)) {
    return startPlusDuration.toDate();
  }

  // Calculate daily shop hours
  const dailyHours =
    shopHours.closeHour >= shopHours.openHour
      ? shopHours.closeHour - shopHours.openHour
      : 24 - shopHours.openHour + shopHours.closeHour;

  // Calculate remaining time after today
  let remainingHours = startPlusDuration.diff(shopCloseToday, 'hours', true);
  let currentDay = moment(start).add(1, 'days');

  // Move to next day when shop is open and technician works
  movePastNonWorkingDays(currentDay, shopHours, technicianWeeklyOffDays);

  // Distribute remaining hours across multiple days if needed
  while (remainingHours > dailyHours) {
    remainingHours -= dailyHours;
    currentDay.add(1, 'days');
    movePastNonWorkingDays(currentDay, shopHours, technicianWeeklyOffDays);
  }

  // Set final time on the last day
  return moment(currentDay)
    .hour(shopHours.openHour)
    .minute(0)
    .second(0)
    .add(remainingHours, 'hours')
    .toDate();
};

type GetDurationParams = {
  start: string;
  end: string;
  appointment: Appointment;
  shopHours?: ShopHours;
  technicianWeeklyOffDays?: number[] | null;
};

export const getDuration = ({
  start,
  end,
  appointment,
  shopHours = DEFAULT_SHOP_HOURS,
  technicianWeeklyOffDays: technicianWeeklyOffOverride = null,
}: GetDurationParams): number => {
  const technicianWeeklyOffDays =
    technicianWeeklyOffOverride ??
    technicianWeeklyOffDaysForAppointment(appointment, undefined);
  const techOff =
    technicianWeeklyOffDays != null && technicianWeeklyOffDays.length > 0
      ? new Set(technicianWeeklyOffDays)
      : null;
  const _start = moment(start);
  const _end = moment(end);

  // Simple case: same day appointment
  if (_start.isSame(_end, 'day')) {
    const startDate = _start.toDate();
    const endDate = _end.toDate();

    // If shop is closed on this day, duration is 0
    if (!isShopOpenDay(_start.day(), shopHours)) {
      return 0;
    }

    if (techOff?.has(_start.day()) ?? false) {
      return 0;
    }

    // If both times are during shop hours, return simple difference
    if (isShopOpen(startDate, shopHours) && isShopOpen(endDate, shopHours)) {
      return roundDuration(_end.diff(_start, 'hours', true));
    }
  }

  // Complex case: calculate business hours only
  let totalDuration = 0;
  const currentDay = _start.clone();

  while (currentDay.isBefore(_end, 'day') || currentDay.isSame(_end, 'day')) {
    const dayOfWeek = currentDay.day();

    // Skip if shop is closed on this day
    if (!isShopOpenDay(dayOfWeek, shopHours)) {
      currentDay.add(1, 'day');
      continue;
    }

    if (techOff?.has(dayOfWeek) ?? false) {
      currentDay.add(1, 'day');
      continue;
    }

    // Calculate shop open/close times for this day
    const shopOpenTime = currentDay.clone().hour(shopHours.openHour).minute(0).second(0);
    let shopCloseTime = currentDay.clone().hour(shopHours.closeHour).minute(0).second(0);

    // Handle overnight hours
    if (shopHours.closeHour < shopHours.openHour) {
      shopCloseTime.add(1, 'day');
    }

    // Determine effective start and end times for this day
    let dayStart = currentDay.isSame(_start, 'day')
      ? moment.max(_start, shopOpenTime)
      : shopOpenTime;

    let dayEnd = currentDay.isSame(_end, 'day') ? moment.min(_end, shopCloseTime) : shopCloseTime;

    // Add duration for this day if valid
    if (dayStart.isBefore(dayEnd)) {
      totalDuration += dayEnd.diff(dayStart, 'hours', true);
    }

    currentDay.add(1, 'day');
  }

  return roundDuration(totalDuration);
};
