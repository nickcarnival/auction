import { type RefObject, useEffect } from 'react';

/**
 * react-big-calendar paints `.rbc-event` absolutely on top of the time grid, so the wheel
 * target is usually the event — not the scrollable grid — and the browser won’t scroll the
 * schedule. Forward deltas to the same containers users hit when scrolling empty track.
 *
 * @param enabled Set false while the scroll container is not mounted (e.g. schedule loading).
 */
export function useForwardWheelFromRbcEvents(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (!(e.target instanceof Element)) return;
      if (!e.target.closest('.rbc-event, .rbc-background-event')) return;

      const timeContent = root.querySelector('.rbc-time-content');
      const dx = e.deltaX + (e.shiftKey ? e.deltaY : 0);
      const dy = e.shiftKey ? 0 : e.deltaY;
      let handled = false;

      if (dx !== 0) {
        /* Prefer the time grid’s own overflow so RBC header/body stay in sync when it provides one */
        if (
          timeContent instanceof HTMLElement &&
          timeContent.scrollWidth > timeContent.clientWidth
        ) {
          const prevTc = timeContent.scrollLeft;
          timeContent.scrollLeft += dx;
          if (timeContent.scrollLeft !== prevTc) handled = true;
        }
        if (!handled && root.scrollWidth > root.clientWidth) {
          const prevRoot = root.scrollLeft;
          root.scrollLeft += dx;
          if (root.scrollLeft !== prevRoot) handled = true;
        }
      }

      if (dy !== 0 && timeContent instanceof HTMLElement) {
        if (timeContent.scrollHeight > timeContent.clientHeight) {
          const prev = timeContent.scrollTop;
          timeContent.scrollTop += dy;
          if (timeContent.scrollTop !== prev) handled = true;
        }
      }

      if (handled) e.preventDefault();
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [containerRef, enabled]);
}
