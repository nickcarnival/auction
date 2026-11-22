import { useAppointmentContext } from '@/components/schedule/appointment-context';
import { BASE_URL } from '@/utils/environment-util';
import { bookingRequestToPlacementDraft } from '@/utils/booking-request-to-placement-draft';
import type { BookingRequest } from '@shared/booking';
import type { AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import moment from 'moment';
import { useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router';
import { useSearchParams } from 'react-router';

/** IDs the user already dropped onto the grid; avoids re-fetch if URL still has `placeRequest` for one frame after draft is cleared. */
const consumedPlaceRequestIds = new Set<string>();

/**
 * Call when merging a request draft into the appointment modal so `PlaceRequestScheduleBridge`
 * does not treat `placementRequestDraft === null` + stale `?placeRequest=` as a fresh navigation.
 */
export function markPlaceRequestPlacementConsumed(bookingRequestId: string): void {
  const id = bookingRequestId.trim();
  if (id) consumedPlaceRequestIds.add(id);
}

export function cancelPlacementRequest(
  setPlacementRequestDraft: (draft: AppointmentSchemaType | null) => void,
  setSearchParams: SetURLSearchParams
): void {
  setPlacementRequestDraft(null);
  setSearchParams(
    prev => {
      const next = new URLSearchParams(prev);
      next.delete('placeRequest');
      return next;
    },
    { replace: true }
  );
}

/**
 * Reads `?placeRequest=<bookingRequestId>`, loads the request, and sets `placementRequestDraft`.
 * UI is the schedule frame border + ghost (see schedule page); this module only runs effects.
 */
export function PlaceRequestScheduleBridge() {
  const [searchParams, setSearchParams] = useSearchParams();
  const placeId = searchParams.get('placeRequest');
  const { placementRequestDraft, setPlacementRequestDraft, setCurrentDate } = useAppointmentContext();

  useEffect(() => {
    if (!placeId) {
      consumedPlaceRequestIds.clear();
      return;
    }

    if (consumedPlaceRequestIds.has(placeId)) {
      // Keep the id in the set until `placeRequest` is gone from the URL. If we removed it
      // immediately, a second effect pass with a still-stale `placeId` would fetch again ("twice").
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete('placeRequest');
          return next;
        },
        { replace: true }
      );
      return;
    }

    if (placementRequestDraft?.bookingRequestId === placeId) return;

    let cancelled = false;

    void (async () => {
      const response = await fetch(
        `${BASE_URL}/api/bookings/get-by-id/${encodeURIComponent(placeId)}`,
        { credentials: 'include' }
      );
      if (cancelled) return;
      if (!response.ok) {
        setPlacementRequestDraft(null);
        setSearchParams(
          prev => {
            const next = new URLSearchParams(prev);
            next.delete('placeRequest');
            return next;
          },
          { replace: true }
        );
        return;
      }
      const req = (await response.json()) as BookingRequest;
      if (cancelled) return;
      const draft = bookingRequestToPlacementDraft(req);
      setPlacementRequestDraft(draft);
      if (req.start) {
        const d = moment(req.start);
        if (d.isValid()) {
          setCurrentDate(d.startOf('day').toDate());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    placeId,
    placementRequestDraft?.bookingRequestId,
    setCurrentDate,
    setPlacementRequestDraft,
    setSearchParams,
  ]);

  useEffect(
    () => () => {
      setPlacementRequestDraft(null);
    },
    [setPlacementRequestDraft]
  );

  return null;
}
