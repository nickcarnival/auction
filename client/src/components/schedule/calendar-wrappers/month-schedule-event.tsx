import { Appointment } from '@shared/appointment';
import type { Event, EventProps } from 'react-big-calendar';
import moment from 'moment';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useAppointmentContext } from '../appointment-context';
import { cn } from '@/lib/utils';
import { getClassName } from '@/components/resources/colors';
import { useResourceContext } from '@/components/resources/resource-context';
import { appointmentFieldIcons } from '@/components/manage-appointment/appointment-display-icons';
import { AppointmentHoverCardPanel } from './appointment-hover-card-panel';
import { WAITER_CALENDAR_BACKGROUND } from './waiter-calendar-surface';
import { Repeat } from 'lucide-react';
import { useMemo } from 'react';
import { RECURRING_BLOCK_CALENDAR_STATUS } from '@shared/recurring-schedule-block-calendar';

type MonthEventProps = EventProps<Event>;

/**
 * Compact month-cell chip: one line + hover details. Keeps the month grid readable
 * (full {@link RegularEvent} / {@link VacationEvent} layouts are for day/week views).
 */
export function MonthScheduleEvent({ event }: MonthEventProps) {
  const appointment = event as Appointment;
  const { highlightAppointmentId, currentAppointment } = useAppointmentContext();
  const { resources } = useResourceContext();

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

  const resource = useMemo(
    () => resources.find(r => r._id === appointment.resourceId),
    [resources, appointment.resourceId]
  );

  const colors = getClassName(resource?.color);
  const status = appointment.status || '';
  const timeLabel = moment(appointment.start).format('h:mm a');
  const vacationLabel = resource?.name?.trim() || appointment.resource?.name?.trim() || 'Vacation';
  const VacationMonthIcon = appointmentFieldIcons.vacation;
  const WaiterCueIcon = appointmentFieldIcons.waiter;

  const compactTrigger =
    status === 'Vacation' ? (
      <div
        className={cn(
          'flex h-full min-h-0 w-full min-w-0 items-center gap-1 rounded-none border border-border px-1 py-px text-xs leading-tight',
          'bg-muted/90 text-foreground'
        )}
      >
        <VacationMonthIcon className="size-3 shrink-0 text-status-vacation" aria-hidden />
        <span className="min-w-0 truncate font-medium">{vacationLabel}</span>
      </div>
    ) : status === RECURRING_BLOCK_CALENDAR_STATUS ? (
      <div
        className={cn(
          'flex h-full min-h-0 w-full min-w-0 items-center gap-1 rounded-sm border border-muted-foreground/35 px-1 py-px text-xs leading-tight',
          'bg-muted/70 text-foreground',
          colors.foreground,
          colors.background,
          colors.border
        )}
      >
        <Repeat className="size-3 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 truncate font-medium">{appointment.customer}</span>
      </div>
    ) : status === 'Waiter' ? (
      <div
        className={cn(
          'relative flex h-full min-h-0 w-full min-w-0 items-baseline gap-1 rounded-sm border px-1 py-px text-xs leading-tight',
          status === 'Awaiting Bike'
            ? 'border-destructive bg-destructive text-destructive-foreground'
            : 'border-primary-deep text-primary-foreground'
        )}
        style={
          status !== 'Awaiting Bike' ? { background: WAITER_CALENDAR_BACKGROUND } : undefined
        }
      >
        <span className="shrink-0 font-medium tabular-nums opacity-90">{timeLabel}</span>
        <WaiterCueIcon
          className={cn(
            'size-3 shrink-0 opacity-90',
            status === 'Awaiting Bike' ? 'text-destructive-foreground' : 'text-primary-foreground'
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate font-medium">{appointment.customer}</span>
      </div>
    ) : (
      <div
        className={cn(
          'relative flex h-full min-h-0 w-full min-w-0 items-baseline gap-1 rounded-sm px-1 py-px text-xs leading-tight',
          status !== 'Awaiting Bike' && colors.foreground,
          status !== 'Awaiting Bike' && colors.background,
          status !== 'Awaiting Bike' && colors.border,
          status !== 'Awaiting Bike' && 'border',
          status === 'Awaiting Bike' &&
            'border border-destructive bg-destructive text-destructive-foreground'
        )}
      >
        <span className="shrink-0 font-medium tabular-nums opacity-90">{timeLabel}</span>
        <span className="min-w-0 truncate font-medium">{appointment.customer}</span>
      </div>
    );

  return (
    <div
      data-appointment-id={id || undefined}
      className={cn(
        'schedule-month-event-outer h-full min-h-0 w-full min-w-0 select-none',
        isSpotlightTarget && 'relative z-[25] rounded-none'
      )}
    >
      <HoverCard>
        <HoverCardTrigger asChild>{compactTrigger}</HoverCardTrigger>
        <HoverCardContent className="p-3 max-h-[350px] overflow-y-auto" side="right">
          <AppointmentHoverCardPanel appointment={appointment} />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
