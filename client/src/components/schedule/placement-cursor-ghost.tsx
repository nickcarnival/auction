import { getClassName } from '@/components/resources/colors';
import { useResourceContext } from '@/components/resources/resource-context';
import { useAppointmentContext } from '@/components/schedule/appointment-context';
import {
  inferTimeGridDateRange,
  resolveTimeGridGhostLayout,
  type GhostSnapLayout,
} from '@/components/schedule/placement-ghost-snap';
import { useShopHours } from '@/contexts/tenant-context';
import { cn } from '@/lib/utils';
import { formatPhone } from '@shared/phone-utils';
import { isSchedulableResource, sortResourcesByOrder } from '@shared/resource';
import { useEffect, useMemo, useRef, useState } from 'react';

const FLOAT_OFFSET = { x: 12, y: 12 };

const DEFAULT_PLACEMENT_DURATION_H = 1.5;

function pointerOverScheduleGrid(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  if (!el || el.closest('.rbc-toolbar')) return false;
  return el.closest('.rbc-time-view, .rbc-month-view, .rbc-agenda-view') !== null;
}

export function PlacementCursorGhost() {
  const { placementRequestDraft: draft, currentDate } = useAppointmentContext();
  const { resources } = useResourceContext();
  const shopHours = useShopHours();
  const [snap, setSnap] = useState<GhostSnapLayout | null>(null);
  const [float, setFloat] = useState<{ x: number; y: number } | null>(null);

  const schedulableResources = useMemo(() => {
    const active = (resources ?? []).filter(r => isSchedulableResource(r));
    return sortResourcesByOrder(active);
  }, [resources]);

  const shopKey = `${shopHours.openHour}-${shopHours.closeHour}-${shopHours.daysOpen.join(',')}`;
  const resourceIdsKey = useMemo(
    () => schedulableResources.map(r => r._id).join('\0'),
    [schedulableResources]
  );

  const draftRef = useRef(draft);
  const resourcesRef = useRef(schedulableResources);
  const shopHoursRef = useRef(shopHours);
  const currentDateRef = useRef(currentDate);
  draftRef.current = draft;
  resourcesRef.current = schedulableResources;
  shopHoursRef.current = shopHours;
  currentDateRef.current = currentDate;

  const placementKey = `${draft?.bookingRequestId ?? ''}\0${draft?._id ?? ''}`;
  const currentDateMs = currentDate.getTime();

  useEffect(() => {
    if (!draft) {
      setSnap(null);
      setFloat(null);
      return;
    }

    const move = (e: PointerEvent) => {
      const d = draftRef.current;
      if (!d) return;
      const duration =
        d.duration != null && d.duration >= 0.5 ? d.duration : DEFAULT_PLACEMENT_DURATION_H;
      const range = inferTimeGridDateRange(currentDateRef.current, shopHoursRef.current);
      const layout = resolveTimeGridGhostLayout(
        e.clientX,
        e.clientY,
        resourcesRef.current ?? undefined,
        range,
        shopHoursRef.current,
        duration
      );

      if (layout) {
        setSnap(layout);
        setFloat(null);
        return;
      }

      if (pointerOverScheduleGrid(e.clientX, e.clientY)) {
        setFloat({ x: e.clientX, y: e.clientY });
        setSnap(null);
        return;
      }

      setSnap(null);
      setFloat(null);
    };

    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [draft, placementKey, currentDateMs, shopKey, resourceIdsKey]);

  if (!draft) return null;

  const resourceForColor = resources.find(r => r._id === (snap?.resourceId ?? draft.resourceId));
  const colors = getClassName(resourceForColor?.color);
  const phone = formatPhone(draft.phone);

  if (snap) {
    return (
      <div
        className={cn(
          'pointer-events-none fixed z-[200] flex flex-col overflow-hidden rounded-none border-2 border-dashed text-xs shadow-lg',
          'opacity-[0.96]',
          colors.background,
          colors.foreground,
          colors.border
        )}
        style={{
          left: snap.left,
          top: snap.top,
          width: snap.width,
          height: snap.height,
          minHeight: 40,
        }}
        aria-hidden
      >
        <div className="shrink-0 bg-neutral px-1 py-px font-semibold text-primary-foreground">
          {snap.dayLabel} · {snap.startTimeLabel}
        </div>
        <div className="min-h-0 flex-1 space-y-px overflow-hidden px-1 py-0.5">
          <p className="truncate font-medium leading-tight">
            {draft.customer?.trim() || (draft._id ? 'Appointment' : 'Request')}
          </p>
          {phone ? <p className="truncate opacity-90">{phone}</p> : null}
          <p className="truncate text-[0.65rem] opacity-80">
            {resourceForColor?.name ?? 'Column · click to place'}
          </p>
        </div>
      </div>
    );
  }

  if (!float) return null;

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[200] w-max max-w-[min(9rem,calc(100vw-1.5rem))]',
        'border-2 border-dashed rounded-none overflow-hidden text-sm shadow-lg opacity-[0.97]',
        colors.background,
        colors.foreground,
        colors.border
      )}
      style={{ left: float.x + FLOAT_OFFSET.x, top: float.y + FLOAT_OFFSET.y }}
      aria-hidden
    >
      <div className="bg-neutral px-1 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
        {draft._id ? 'Reschedule' : 'Request'} · {draft.duration ?? '—'}h
      </div>
      <div className="space-y-0.5 p-0.5 px-1">
        <p className="truncate font-medium leading-tight">
          {draft.customer?.trim() || (draft._id ? 'Appointment' : 'Request')}
        </p>
        {phone ? <p className="truncate text-[0.7rem] opacity-90">{phone}</p> : null}
        <p className="text-[0.65rem] font-medium opacity-90">Click open slot</p>
      </div>
    </div>
  );
}
