import { useResourceContext } from '@/components/resources/resource-context';
import { CalendarAppointmentSummaryRow } from '@/components/schedule/calendar-appointment-summary-row';
import { useAppointmentContext } from '@/components/schedule/appointment-context';
import { Appointment } from '@shared/appointment';
import moment from 'moment';
import { Skeleton } from '@/components/ui/skeleton';
import {
  appointmentPrimaryLabel,
  appointmentTechnicianName,
} from '@/utils/appointment-primary-label';

interface AppointmentsListProps {
  appointments?: Appointment[];
  isLoading?: boolean;
}

export function AppointmentsList({ appointments, isLoading }: AppointmentsListProps) {
  const { focusAppointmentOnSchedule } = useAppointmentContext();
  const { getResourceById } = useResourceContext();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!appointments?.length) {
    return <p className="text-center text-muted-foreground">No appointments found</p>;
  }

  return (
    <ul className="space-y-1.5">
      {appointments.map((appointment, index) => {
        const id = appointment._id?.trim();
        const rid = appointment.resourceId?.trim();
        const resCtx = rid ? getResourceById(rid) : undefined;
        const techFromDoc = appointmentTechnicianName(appointment);
        const technician = techFromDoc || resCtx?.name?.trim() || null;
        const colorKey = appointment.resource?.color ?? resCtx?.color ?? null;
        const ariaTitle = appointmentPrimaryLabel(appointment);
        const serviceLine = appointment.service?.trim() || null;
        const isConfirmed = !!(appointment.checkedIn || appointment.isConfirmed);

        return (
          <CalendarAppointmentSummaryRow
            key={id ?? `customer-appt-${index}`}
            ariaLabel={`Open this appointment on the schedule: ${ariaTitle}${technician ? `, ${technician}` : ''} ${moment(appointment.start).format('MMM D, YYYY')}`}
            onOpenOnSchedule={() =>
              id ? focusAppointmentOnSchedule(id, appointment.start) : undefined
            }
            disabled={!id}
            isConfirmed={isConfirmed}
            technicianName={technician}
            technicianColorKey={colorKey}
            durationHours={appointment.duration}
            start={appointment.start}
            end={appointment.end}
            primaryLabel={serviceLine}
            notes={appointment.notes}
          />
        );
      })}
    </ul>
  );
}
