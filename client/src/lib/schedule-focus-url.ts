import moment from 'moment';

/** Query key: open schedule and spotlight this appointment (`GET` shareable). */
export const FOCUS_APPOINTMENT_SEARCH_PARAM = 'focusAppointment';

/** Optional ISO start hint when the appointment is not in memory yet (e.g. cold open). */
export const FOCUS_APPOINTMENT_ANCHOR_PARAM = 'focusAnchor';

/**
 * Path + query to open the main schedule with an appointment highlighted.
 * `anchorStart` should match `appointment.start` when available so the calendar week resolves before the list loads.
 */
export function scheduleFocusAppointmentHref(
  appointmentId: string,
  anchorStart?: string | Date | null
): string {
  const id = appointmentId.trim();
  const qs = new URLSearchParams();
  qs.set(FOCUS_APPOINTMENT_SEARCH_PARAM, id);
  if (anchorStart != null && anchorStart !== '') {
    const m = moment(anchorStart);
    if (m.isValid()) {
      qs.set(FOCUS_APPOINTMENT_ANCHOR_PARAM, m.toISOString());
    }
  }
  return `/dashboard/schedule?${qs.toString()}`;
}
