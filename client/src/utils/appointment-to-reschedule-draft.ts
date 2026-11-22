import { FORMAT } from '@shared/date-utils';
import type { AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import moment from 'moment';

/**
 * Build a calendar placement draft from a saved appointment so the schedule slot-picker flow
 * can run like booking-request placement. Keeps `_id` so merging a slot opens the edit modal.
 */
export function appointmentToReschedulePlacementDraft(
  appt: AppointmentSchemaType
): AppointmentSchemaType | null {
  const _id = typeof appt._id === 'string' && appt._id.trim() !== '' ? appt._id.trim() : undefined;
  if (!_id) return null;

  const startM = moment(appt.start as string | Date);
  if (!startM.isValid()) return null;
  const start = startM.format(FORMAT);

  const endRaw = appt.end;
  const end =
    endRaw != null && endRaw !== ''
      ? (() => {
          const endM = moment(endRaw as string | Date);
          return endM.isValid() ? endM.format(FORMAT) : start;
        })()
      : start;

  return {
    ...appt,
    _id,
    start,
    end,
  };
}
