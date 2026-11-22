import { useAppointmentContext } from '@/components/schedule/appointment-context';
import {
  FOCUS_APPOINTMENT_ANCHOR_PARAM,
  FOCUS_APPOINTMENT_SEARCH_PARAM,
} from '@/lib/schedule-focus-url';
import moment from 'moment';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Applies `?focusAppointment=<id>&focusAnchor=<iso>` on the schedule route after appointments load,
 * then strips those params so the URL stays clean. Enables shareable links from technician “Today”
 * and other entry points.
 */
export function ScheduleFocusAppointmentBridge() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get(FOCUS_APPOINTMENT_SEARCH_PARAM)?.trim() ?? '';
  const focusAnchorRaw = searchParams.get(FOCUS_APPOINTMENT_ANCHOR_PARAM);
  const {
    appointments,
    isLoadingAppointments,
    setCurrentDate,
    setHighlightAppointmentId,
    setCurrentAppointment,
  } = useAppointmentContext();

  useEffect(() => {
    if (!focusId) {
      return;
    }
    if (isLoadingAppointments) {
      return;
    }

    const clearParams = () => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete(FOCUS_APPOINTMENT_SEARCH_PARAM);
          next.delete(FOCUS_APPOINTMENT_ANCHOR_PARAM);
          return next;
        },
        { replace: true }
      );
    };

    const found = appointments.find(a => String(a._id) === String(focusId));
    let dayMoment: moment.Moment | null = null;
    if (found?.start) {
      const m = moment(found.start);
      if (m.isValid()) {
        dayMoment = m;
      }
    }
    if (!dayMoment && focusAnchorRaw) {
      const m = moment(focusAnchorRaw);
      if (m.isValid()) {
        dayMoment = m;
      }
    }

    setCurrentAppointment(null);
    if (dayMoment) {
      setCurrentDate(dayMoment.startOf('day').toDate());
    }
    setHighlightAppointmentId(focusId);
    clearParams();
  }, [
    appointments,
    focusAnchorRaw,
    focusId,
    isLoadingAppointments,
    setCurrentAppointment,
    setCurrentDate,
    setHighlightAppointmentId,
    setSearchParams,
  ]);

  return null;
}
