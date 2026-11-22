import { useResourceContext } from '@/components/resources/resource-context';
import { TechnicianColorSwatch } from '@/components/resources/technician-color-swatch';
import { Appointment } from '@shared/appointment';
import type { Event } from 'react-big-calendar';
import { useMemo } from 'react';

export function AgendaWrapper({ event }: { event: Event }) {
  const appointment = event as Appointment;
  const appointmentId =
    appointment._id != null && String(appointment._id).trim() !== ''
      ? String(appointment._id)
      : undefined;
  const { getResourceById } = useResourceContext();
  const startTime = appointment.start
    ? new Date(appointment.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const resource = useMemo(() => {
    return getResourceById(appointment.resourceId);
  }, [appointment.resourceId, getResourceById]);

  return (
    <div
      data-appointment-id={appointmentId}
      className="select-none p-2 bg-card text-card-foreground rounded-none shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex gap-2 items-center mb-1">
        <span className="font-medium text-primary">{startTime}</span>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">{resource?.name ?? ''}</span>
          <TechnicianColorSwatch colorKey={resource?.color} />
        </div>
      </div>

      <div className="flex justify-between items-center mt-1 text-sm">
        <span className="truncate">Customer: {appointment.customer ?? ''}</span>
        <span className="truncate text-muted-foreground">Bike: {appointment.vehicle ?? ''}</span>
      </div>
    </div>
  );
}
