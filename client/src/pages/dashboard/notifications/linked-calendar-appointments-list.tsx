import type { BookingRequestLinkedAppointment } from '@shared/booking';
import moment from 'moment';
import { useMemo } from 'react';
import { LinkedCalendarAppointmentRow } from './linked-calendar-appointment-row';

interface LinkedCalendarAppointmentsListProps {
  appointments: BookingRequestLinkedAppointment[];
}

export function LinkedCalendarAppointmentsList({ appointments }: LinkedCalendarAppointmentsListProps) {
  const sorted = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const ta = a.start ? moment(a.start).valueOf() : 0;
        const tb = b.start ? moment(b.start).valueOf() : 0;
        return ta - tb;
      }),
    [appointments]
  );

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold text-foreground">On calendar</p>
      {sorted.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          None yet — use Add to Calendar from the footer.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map(app => (
            <LinkedCalendarAppointmentRow key={app._id} appointment={app} />
          ))}
        </ul>
      )}
    </div>
  );
}
