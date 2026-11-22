import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Views, type View } from 'react-big-calendar';

const TIME_CONTENT = '.rbc-time-content';
const GUTTER = 'rbc-time-gutter';
const RESOURCE_GROUPING = '.rbc-time-header-content.rbc-resource-grouping';

const SYNC_PROPS = [
  'width',
  'min-width',
  'max-width',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
] as const;

function clearSyncStyles(el: HTMLElement) {
  for (const p of SYNC_PROPS) {
    el.style.removeProperty(p);
  }
}

/**
 * Layout width in CSS pixels including border (matches how columns visually size). `offsetWidth`
 * is integer-rounded in common browsers and stacks error at 100%+ page zoom; `getBoundingClientRect`
 * keeps fractional CSS px like the default RBC flex layout would before we lock widths.
 */
function widthCssPx(el: HTMLElement): string {
  const raw = el.getBoundingClientRect().width;
  if (!Number.isFinite(raw) || raw <= 0) {
    return '0px';
  }
  return `${raw.toFixed(4)}px`;
}

/**
 * Copies measured widths from the time-grid body to the resource header so column seams stay aligned.
 * RBC lays out header and body in separate flex trees; with many `flex: 1` columns, subpixel
 * rounding drifts progressively. This runs after {@link useScheduleWeeklyOffColumnLayout} so
 * `!important` collapse styles win where they apply.
 */
export function useSyncResourceHeaderColumnWidths({
  rootRef,
  enabled,
  view,
  rangeLength,
  resourceCount,
}: {
  rootRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  view: View;
  rangeLength: number;
  resourceCount: number;
}): void {
  const syncedElsRef = useRef<HTMLElement[]>([]);

  useLayoutEffect(() => {
    if (!enabled || resourceCount < 2) {
      return;
    }
    if (view !== Views.WORK_WEEK && view !== Views.DAY) {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    const content = root.querySelector(TIME_CONTENT);
    if (!content) {
      return;
    }

    const sync = () => {
      const headerGroups = root.querySelectorAll(RESOURCE_GROUPING);
      if (headerGroups.length !== rangeLength) {
        return;
      }

      const dayRows = [...content.children].filter(ch => !ch.classList.contains(GUTTER));
      if (dayRows.length !== rangeLength) {
        return;
      }

      const modified: HTMLElement[] = [];

      for (let d = 0; d < rangeLength; d++) {
        const dayOuter = dayRows[d] as HTMLElement;
        const group = headerGroups[d] as HTMLElement;
        if (!group || group.children.length < 2) {
          continue;
        }

        const dayW = widthCssPx(dayOuter);
        group.style.setProperty('flex', 'none');
        group.style.setProperty('width', dayW);
        group.style.setProperty('min-width', dayW);
        group.style.setProperty('max-width', dayW);
        modified.push(group);

        const headerRow = group.children[1] as HTMLElement;
        const allDayRow = group.children[2] as HTMLElement | undefined;

        for (let j = 0; j < resourceCount; j++) {
          const bodyWrap = dayOuter.children[j] as HTMLElement | undefined;
          const hCell = headerRow.children[j] as HTMLElement | undefined;
          if (!bodyWrap || !hCell) {
            continue;
          }

          const w = widthCssPx(bodyWrap);
          hCell.style.setProperty('flex', 'none');
          hCell.style.setProperty('width', w);
          hCell.style.setProperty('min-width', w);
          hCell.style.setProperty('max-width', w);
          modified.push(hCell);

          if (allDayRow && allDayRow.children[j] instanceof HTMLElement) {
            const aCell = allDayRow.children[j] as HTMLElement;
            const cs = getComputedStyle(aCell);
            if (cs.display !== 'none') {
              aCell.style.setProperty('flex', 'none');
              aCell.style.setProperty('width', w);
              aCell.style.setProperty('min-width', w);
              aCell.style.setProperty('max-width', w);
              modified.push(aCell);
            }
          }
        }
      }

      syncedElsRef.current = modified;
    };

    let rafId = 0;
    const scheduleSync = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        sync();
      });
    };

    scheduleSync();

    const ro = new ResizeObserver(() => {
      scheduleSync();
    });
    ro.observe(content);
    window.addEventListener('resize', scheduleSync);

    const vv = window.visualViewport;
    vv?.addEventListener('resize', scheduleSync);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', scheduleSync);
      vv?.removeEventListener('resize', scheduleSync);
      for (const el of syncedElsRef.current) {
        clearSyncStyles(el);
      }
      syncedElsRef.current = [];
    };
  }, [enabled, rangeLength, resourceCount, rootRef, view]);
}
