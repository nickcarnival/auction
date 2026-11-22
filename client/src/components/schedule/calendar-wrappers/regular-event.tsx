import { Appointment } from '@shared/appointment';
import { formatPhone } from '@shared/phone-utils';
import moment from 'moment';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { type AppointmentStatus as StatusType } from '../../manage-appointment/appointment-status';
import { AppointmentEventBanners } from '@/components/manage-appointment/appointment-event-banners';
import { cn } from '@/lib/utils';
import { getClassName } from '@/components/resources/colors';
import { useResourceContext } from '@/components/resources/resource-context';
import { useMemo } from 'react';
import { AppointmentHoverCardPanel } from './appointment-hover-card-panel';
import { WAITER_CALENDAR_BACKGROUND } from './waiter-calendar-surface';

interface RegularEventProps {
  appointment: Appointment;
}

/** Day/week normal service appointments. Vacation / recurring-block cells use dedicated components instead. */
export const RegularEvent = ({ appointment }: RegularEventProps) => {
  const { resources } = useResourceContext();

  const resourceColor = useMemo(() => {
    const resource = resources.find(r => r._id === appointment.resourceId);
    return resource?.color;
  }, [resources, appointment.resourceId]);

  const colors = getClassName(resourceColor);
  const status = (appointment.status || '') as StatusType;
  const isWaiterShell = status !== 'Awaiting Bike' && status === 'Waiter';

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            'schedule-event-shell relative flex min-h-0 min-w-0 flex-col gap-px overflow-hidden text-xs leading-tight h-full w-full p-0',
            status === 'Awaiting Bike' &&
              'border-[2px] bg-destructive text-destructive-foreground border-destructive',
            isWaiterShell && ['border-[2px] border-primary-deep text-primary-foreground'],
            status !== 'Awaiting Bike' &&
              status !== 'Waiter' && [
                colors.foreground,
                colors.background,
                'border-[2px]',
                colors.border,
              ]
          )}
          style={
            isWaiterShell ? { background: WAITER_CALENDAR_BACKGROUND } : undefined
          }
        >
          <AppointmentEventBanners appointment={appointment} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-px px-0.5 pb-0.5 pt-px">
            <p className="break-words font-medium">{appointment.customer}</p>
            <p className="min-w-0 tabular-nums">{formatPhone(appointment.phone)}</p>
            {appointment.vehicle && (
              <p className="min-w-0 break-words" title={appointment.vehicle}>
                {appointment.vehicle}
              </p>
            )}

            {appointment.service && (
              <p className="min-w-0 break-words" title={appointment.service}>
                Service: {appointment.service}
              </p>
            )}

            {appointment.end && (
              <p>
                <span
                  className={
                    isWaiterShell ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }
                >
                  Promised{' '}
                </span>
                <span>{moment(appointment.end).format('MMM DD, YYYY')}</span>
              </p>
            )}

            {appointment.notes && <p className="min-w-0 break-words">{appointment.notes}</p>}
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="p-3 max-h-[350px] overflow-y-auto" side="right">
        <AppointmentHoverCardPanel appointment={appointment} />
      </HoverCardContent>
    </HoverCard>
  );
};
