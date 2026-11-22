import { Appointment } from '@shared/appointment';
import type { Event, EventProps } from 'react-big-calendar';
import { VacationEvent } from './vacation-event';
import { RegularEvent } from './regular-event';
import { RecurringBlockEvent } from './recurring-block-event';
import { RECURRING_BLOCK_CALENDAR_STATUS } from '@shared/recurring-schedule-block-calendar';
import { useAppointmentContext } from '../appointment-context';
import { cn } from '@/lib/utils';

type EventComponentProps = EventProps<Event>;

export const EventComponent = ({ event }: EventComponentProps) => {
  const appointment = event as Appointment;
  const { highlightAppointmentId, currentAppointment } = useAppointmentContext();
  const id = appointment._id != null ? String(appointment._id) : '';
  const modalId =
    currentAppointment?._id != null && String(currentAppointment._id).trim() !== ''
      ? String(currentAppointment._id)
      : '';
  const isSpotlightTarget = Boolean(
    id &&
      ((highlightAppointmentId && String(highlightAppointmentId) === id) ||
        (modalId && modalId === id))
  );
  const status = appointment.status || '';

  return (
    <div
      data-appointment-id={id || undefined}
      className={cn(
        'schedule-event-outer h-full min-h-0 min-w-0 w-full select-none',
        isSpotlightTarget && 'relative z-[25]'
      )}
    >
      {status === 'Vacation' ? (
        <VacationEvent appointment={appointment} />
      ) : status === RECURRING_BLOCK_CALENDAR_STATUS ? (
        <RecurringBlockEvent appointment={appointment} />
      ) : (
        <RegularEvent appointment={appointment} />
      )}
    </div>
  );
};
