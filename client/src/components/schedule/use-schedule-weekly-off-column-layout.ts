import { useLayoutEffect, type RefObject } from 'react';
import type { Resource } from '@shared/resource';
import { isResourceWeeklyOffOnLocalDay } from '@shared/resource';
import { Views, type View } from 'react-big-calendar';

const RBC_TIME_CONTENT = '.rbc-time-content';
const RBC_TIME_GUTTER = 'rbc-time-gutter';
const RBC_RESOURCE_GROUPING = '.rbc-time-header-content.rbc-resource-grouping';

const HIDDEN_PROPS = [
  'flex',
  'width',
  'min-width',
  'max-width',
  'overflow',
  'opacity',
  'border-width',
  'margin',
  'padding',
] as const;

function clearCollapsedStyles(el: HTMLElement) {
  for (const p of HIDDEN_PROPS) {
    el.style.removeProperty(p);
  }
}

function applyHiddenColumn(el: HTMLElement) {
  /* `important` so collapsed columns win over stylesheet `flex: … !important` on resource wrappers. */
  el.style.setProperty('flex', '0 0 0px', 'important');
  el.style.setProperty('width', '0', 'important');
  el.style.setProperty('min-width', '0', 'important');
  el.style.setProperty('max-width', '0', 'important');
  el.style.setProperty('overflow', 'hidden');
  el.style.setProperty('opacity', '0');
  el.style.setProperty('border-width', '0');
  el.style.setProperty('margin', '0');
  el.style.setProperty('padding', '0');
}

/**
 * Collapses react-big-calendar resource columns when a technician has that weekday in
 * `weeklyOffDays` (work week + day views, multiple technicians). Resource headers do not receive
 * `date` from RBC; we align header + body using the same range as {@link getWorkWeekDatesForTenant}.
 */
export function useScheduleWeeklyOffColumnLayout({
  rootRef,
  enabled,
  view,
  range,
  resources,
}: {
  rootRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  view: View;
  range: Date[];
  resources: Resource[];
}): void {
  useLayoutEffect(() => {
    if (!enabled || resources.length <= 1) {
      return;
    }
    if (view !== Views.WORK_WEEK && view !== Views.DAY) {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    const content = root.querySelector(RBC_TIME_CONTENT);
    const headerGroups = root.querySelectorAll(RBC_RESOURCE_GROUPING);
    if (!content || headerGroups.length !== range.length) {
      return;
    }

    const dayRows = [...content.children].filter(ch => !ch.classList.contains(RBC_TIME_GUTTER));
    if (dayRows.length !== range.length) {
      return;
    }

    const modified: HTMLElement[] = [];

    for (const [d, date] of range.entries()) {
      const dayRow = dayRows[d] as HTMLElement;
      const group = headerGroups[d] as HTMLElement | undefined;

      for (const [j, res] of resources.entries()) {
        const off = isResourceWeeklyOffOnLocalDay(res, date);

        const bodyWrap = dayRow.children[j];
        if (bodyWrap instanceof HTMLElement) {
          clearCollapsedStyles(bodyWrap);
          modified.push(bodyWrap);
          if (off) {
            applyHiddenColumn(bodyWrap);
          }
        }

        if (group && group.children.length >= 3) {
          const headerRow = group.children[1];
          const allDayRow = group.children[2];
          const hCell = headerRow?.children[j];
          const aCell = allDayRow?.children[j];
          if (hCell instanceof HTMLElement) {
            clearCollapsedStyles(hCell);
            modified.push(hCell);
            if (off) {
              applyHiddenColumn(hCell);
            }
          }
          if (aCell instanceof HTMLElement) {
            clearCollapsedStyles(aCell);
            modified.push(aCell);
            if (off) {
              applyHiddenColumn(aCell);
            }
          }
        }
      }
    }

    return () => {
      for (const el of modified) {
        clearCollapsedStyles(el);
      }
    };
  }, [enabled, resources, range, rootRef, view]);
}
