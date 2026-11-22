import { useResourceContext } from '@/components/resources/resource-context';
import { CalendarAppointmentSummaryRow } from '@/components/schedule/calendar-appointment-summary-row';
import { useAppointmentContext } from '@/components/schedule/appointment-context';
import type { BookingRequestLinkedAppointment } from '@shared/booking';
import moment from 'moment';

interface LinkedCalendarAppointmentRowProps {
  appointment: BookingRequestLinkedAppointment;
}

export function LinkedCalendarAppointmentRow({ appointment }: LinkedCalendarAppointmentRowProps) {
  const { focusAppointmentOnSchedule } = useAppointmentContext();
  const { getResourceById } = useResourceContext();
  const resource = appointment.resourceId
    ? getResourceById(appointment.resourceId)
    : undefined;
  const tech = resource?.name?.trim() || undefined;

  const goToSchedule = () => {
    focusAppointmentOnSchedule(appointment._id, appointment.start);
  };

  return (
    <CalendarAppointmentSummaryRow
      ariaLabel={`Open on schedule: ${tech ?? 'Appointment'} ${appointment.start ? moment(appointment.start).format('MMM D, YYYY') : ''}`}
      onOpenOnSchedule={goToSchedule}
      isConfirmed={!!appointment.isConfirmed}
      technicianName={tech}
      technicianColorKey={resource?.color}
      durationHours={appointment.duration}
      start={appointment.start}
      end={appointment.end}
    />
  );
}
