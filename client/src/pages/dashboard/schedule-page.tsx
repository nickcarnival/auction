import { Suspense } from 'react';
import { lazyRoute } from '@/lib/lazy-route';
import { AppointmentModal } from '@/components/manage-appointment/appointment-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GenericFallback } from '@/components/generic-fallback';
import { NoTechniciansScreen } from '@/components/schedule/no-technicians-screen';
import { PlacementCursorGhost } from '@/components/schedule/placement-cursor-ghost';
import { ScheduleFocusAppointmentBridge } from '@/components/schedule/schedule-focus-appointment-bridge';
import {
  cancelPlacementRequest,
  PlaceRequestScheduleBridge,
} from '@/components/schedule/place-request-schedule-bridge';
import { useAppointmentContext } from '@/components/schedule/appointment-context';
import { useResourceContext } from '@/components/resources/resource-context';
import { isSchedulableResource } from '@shared/resource';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';

const Schedule = lazyRoute(() => import('@/components/schedule/schedule-calendar'));

export default function SchedulePage() {
  const { resources, isLoadingResources } = useResourceContext();
  const { placementRequestDraft, setPlacementRequestDraft } = useAppointmentContext();
  const [, setSearchParams] = useSearchParams();

  const schedulableCount = useMemo(
    () => (resources ?? []).filter(r => isSchedulableResource(r)).length,
    [resources]
  );
  const hasNoActiveTechnicians = !isLoadingResources && schedulableCount === 0;
  const hasNoTechniciansAtAll = !isLoadingResources && (!resources || resources.length === 0);

  useEffect(() => {
    if (!placementRequestDraft) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      cancelPlacementRequest(setPlacementRequestDraft, setSearchParams);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [placementRequestDraft, setPlacementRequestDraft, setSearchParams]);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <Suspense fallback={<GenericFallback />}>
        <AppointmentModal />
        {!hasNoActiveTechnicians ? (
          <>
            <PlaceRequestScheduleBridge />
            <ScheduleFocusAppointmentBridge />
            <PlacementCursorGhost />
          </>
        ) : null}
        {hasNoActiveTechnicians ? (
          <NoTechniciansScreen allInactive={!hasNoTechniciansAtAll} />
        ) : (
          <Suspense
            fallback={
              <div className="flex min-h-0 flex-1 flex-col">
                <Skeleton className="h-full min-h-0 w-full" />
              </div>
            }
          >
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <Schedule />
              {placementRequestDraft ? (
                <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 flex flex-wrap items-center justify-end gap-2">
                  <div
                    className="pointer-events-auto mr-auto flex max-w-[min(100%,20rem)] items-center gap-2 rounded-full border border-warning/70 bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-md backdrop-blur-sm"
                    role="status"
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-60 motion-reduce:animate-none" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
                    </span>
                    <span className="truncate">
                      {placementRequestDraft?._id ? 'Rescheduling appointment' : 'Placing request'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="pointer-events-auto shrink-0"
                    onClick={() => cancelPlacementRequest(setPlacementRequestDraft, setSearchParams)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          </Suspense>
        )}
      </Suspense>
    </div>
  );
}
