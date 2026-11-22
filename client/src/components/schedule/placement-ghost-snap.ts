import { CALENDAR_SLOT_STEP_MINUTES } from '@/components/schedule/duration';
import type { Resource } from '@shared/resource';
import type { ShopHours } from '@shared/shop-hours';
import { getWorkWeekDatesForTenant } from '@/utils/work-week-range';
import moment from 'moment';

export type GhostSnapLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  resourceId: string;
  dayLabel: string;
  startTimeLabel: string;
};

/**
 * Assumes react-big-calendar **range-first** resource layout (`resourceGroupingLayout` when
 * technicians exist): `.rbc-time-content` → day rows → resource wrappers → `.rbc-day-slot`.
 * If RBC layout or `resourceGroupingLayout` changes, update `findContainingDaySlot` /
 * `dayAndResourceIndex`.
 */
const RBC_TIME_CONTENT = '.rbc-time-content';
const RBC_TIME_GUTTER = 'rbc-time-gutter';
const RBC_DAY_SLOT = 'rbc-day-slot';
const RBC_TIME_VIEW = '.rbc-time-view';

const GHOST_MIN_WIDTH_PX = 48;

/** One day row ⇒ day view; otherwise multi-day work-week range from tenant settings. */
export function inferTimeGridDateRange(currentDate: Date, shopHours: ShopHours): Date[] {
  const content = document.querySelector(RBC_TIME_CONTENT);
  if (!content) {
    return getWorkWeekDatesForTenant(currentDate, shopHours.daysOpen);
  }
  const dayRowCount = [...content.children].filter(ch => !ch.classList.contains(RBC_TIME_GUTTER))
    .length;
  if (dayRowCount <= 1) {
    return [moment(currentDate).startOf('day').toDate()];
  }
  return getWorkWeekDatesForTenant(currentDate, shopHours.daysOpen);
}

function findContainingDaySlot(clientX: number, clientY: number): HTMLElement | null {
  const content = document.querySelector(RBC_TIME_CONTENT);
  if (!content) return null;

  for (const dayRow of content.children) {
    if (dayRow.classList.contains(RBC_TIME_GUTTER)) continue;
    for (const wrap of dayRow.children) {
      const slot = wrap.firstElementChild as HTMLElement | null;
      if (!slot?.classList.contains(RBC_DAY_SLOT)) continue;
      const r = slot.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return slot;
      }
    }
  }
  return null;
}

function dayAndResourceIndex(
  column: HTMLElement,
  content: Element
): { dayIndex: number; resourceIndex: number } | null {
  const resourceWrap = column.parentElement;
  const dayRow = resourceWrap?.parentElement;
  if (!resourceWrap || !dayRow || !content.contains(dayRow)) return null;

  const dayRows = [...content.children].filter(ch => !ch.classList.contains(RBC_TIME_GUTTER));
  const dayIndex = dayRows.indexOf(dayRow as Element);
  if (dayIndex === -1) return null;

  const resourceIndex = [...dayRow.children].indexOf(resourceWrap);
  if (resourceIndex === -1) return null;

  return { dayIndex, resourceIndex };
}

function slotIndexAtY(column: HTMLElement, clientY: number): { index: number; slotEl: HTMLElement } | null {
  const slots = column.querySelectorAll<HTMLElement>('.rbc-time-slot');
  if (!slots.length) return null;

  for (const [i, slot] of [...slots].entries()) {
    const r = slot.getBoundingClientRect();
    if (clientY >= r.top && clientY < r.bottom) {
      return { index: i, slotEl: slot };
    }
  }

  let nearest = 0;
  let best = Infinity;
  for (const [i, slot] of [...slots].entries()) {
    const r = slot.getBoundingClientRect();
    const mid = (r.top + r.bottom) / 2;
    const dist = Math.abs(clientY - mid);
    if (dist < best) {
      best = dist;
      nearest = i;
    }
  }
  return { index: nearest, slotEl: slots[nearest] };
}

/**
 * Snap placement ghost to a time/resource cell in `.rbc-time-view`. Returns null if not over the time grid.
 */
export function resolveTimeGridGhostLayout(
  clientX: number,
  clientY: number,
  resources: Resource[] | undefined,
  range: Date[],
  shopHours: ShopHours,
  durationHours: number
): GhostSnapLayout | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el?.closest(RBC_TIME_VIEW)) return null;

  const column = findContainingDaySlot(clientX, clientY);
  const content = document.querySelector(RBC_TIME_CONTENT);
  if (!column || !content) return null;

  const indices = dayAndResourceIndex(column, content);
  if (!indices) return null;

  const { dayIndex, resourceIndex } = indices;
  const columnDate = range[dayIndex];
  if (!columnDate) return null;

  const resourceList = resources?.length ? resources : [];
  const resource = resourceList[resourceIndex];
  const resourceId = resource?._id ?? '';

  const slotHit = slotIndexAtY(column, clientY);
  if (!slotHit) return null;

  const { index: slotIdx, slotEl } = slotHit;
  const slotH = slotEl.getBoundingClientRect().height;
  const slotsForDuration = Math.max(1, Math.round((durationHours * 60) / CALENDAR_SLOT_STEP_MINUTES));
  const heightPx = slotsForDuration * slotH;

  const colRect = column.getBoundingClientRect();
  const sr = slotEl.getBoundingClientRect();

  const startM = moment(columnDate)
    .startOf('day')
    .hour(shopHours.openHour)
    .minute(0)
    .second(0)
    .millisecond(0)
    .add(slotIdx * CALENDAR_SLOT_STEP_MINUTES, 'minutes');

  return {
    left: colRect.left + 1,
    top: sr.top + 1,
    width: Math.max(GHOST_MIN_WIDTH_PX, colRect.width - 2),
    height: Math.min(heightPx, colRect.bottom - sr.top - 2),
    resourceId,
    dayLabel: startM.format('ddd M/D'),
    startTimeLabel: startM.format('h:mm A'),
  };
}
