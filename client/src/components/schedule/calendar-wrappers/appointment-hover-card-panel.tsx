import { Appointment } from '@shared/appointment';
import { formatPhone } from '@shared/phone-utils';
import moment from 'moment';
import { Repeat } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { appointmentFieldIcons } from '@/components/manage-appointment/appointment-display-icons';
import { getEndDate, technicianWeeklyOffDaysForAppointment } from '../duration';
import { useShopHours } from '@/contexts/tenant-context';
import { useResourceContext } from '@/components/resources/resource-context';
import { useMemo } from 'react';
import { RECURRING_BLOCK_CALENDAR_STATUS } from '@shared/recurring-schedule-block-calendar';
import { cn } from '@/lib/utils';
import { TechnicianColorSwatch } from '@/components/resources/technician-color-swatch';

interface AppointmentHoverCardPanelProps {
  appointment: Appointment;
}

function TechnicianHoverLine({ name, colorKey }: { name: string; colorKey?: string | null }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
      <TechnicianColorSwatch colorKey={colorKey} size="sm" />
      <span className="min-w-0 truncate">{name}</span>
    </p>
  );
}

/** Shared body for calendar appointment HoverCards (day/week/month compact events). */
export function AppointmentHoverCardPanel({ appointment }: AppointmentHoverCardPanelProps) {
  const shopHours = useShopHours();
  const { resources } = useResourceContext();

  const technicianDisplay = useMemo(() => {
    const embedded = appointment.resource?.name?.trim();
    const r = resources.find(res => res._id === appointment.resourceId);
    const name = embedded || r?.name?.trim() || 'Technician';
    const colorSource = r ?? appointment.resource;
    return { name, colorKey: colorSource?.color };
  }, [appointment.resource, appointment.resourceId, resources]);

  const startTime = moment(appointment.start).format('M/D hh:mm A');
  const endTime = moment(
    getEndDate({
      start: appointment.start,
      duration: appointment.duration,
      shopHours,
      technicianWeeklyOffDays: technicianWeeklyOffDaysForAppointment(appointment, resources),
    })
  ).format('M/D hh:mm A');

  if (appointment.status === RECURRING_BLOCK_CALENDAR_STATUS) {
    const startM = moment(appointment.start);
    const endWall = startM.clone().add(appointment.duration ?? 0.5, 'hours');
    return (
      <div className="flex flex-col gap-1 text-xs leading-tight">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            Recurring block
          </h4>
          <p className="font-medium">{appointment.customer}</p>
          <TechnicianHoverLine name={technicianDisplay.name} colorKey={technicianDisplay.colorKey} />
        </div>
        <p className="tabular-nums text-foreground">
          {startM.format('M/D hh:mm A')} → {endWall.format('M/D hh:mm A')}
          {appointment.duration != null && appointment.duration > 0 ? (
            <span className="text-muted-foreground"> · {appointment.duration} h wall</span>
          ) : null}
        </p>
        {appointment.notes?.trim() ? (
          <>
            <Separator className="my-0.5" />
            <div>
              <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Note</span>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{appointment.notes.trim()}</p>
            </div>
          </>
        ) : null}
        <p className="text-muted-foreground">Settings → Operations → Recurring blocks.</p>
      </div>
    );
  }

  if (appointment.status === 'Vacation') {
    const VacationHeadingIcon = appointmentFieldIcons.vacation;
    return (
      <div className="flex flex-col gap-1 text-xs leading-tight">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            <VacationHeadingIcon className="size-3.5 shrink-0 text-status-vacation" aria-hidden />
            <span className="text-status-vacation">Vacation / time off</span>
          </h4>
          <TechnicianHoverLine name={technicianDisplay.name} colorKey={technicianDisplay.colorKey} />
        </div>
        <p className="tabular-nums text-foreground">
          {startTime} → {endTime}
          {appointment.duration != null && appointment.duration > 0 ? (
            <span className="text-muted-foreground"> · {appointment.duration} h</span>
          ) : null}
        </p>
        {appointment.notes?.trim() ? (
          <>
            <Separator className="my-0.5" />
            <div>
              <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Notes</span>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{appointment.notes.trim()}</p>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const rawStatus = (appointment.status ?? '').trim();
  const CheckedInDdIcon = appointment.checkedIn
    ? appointmentFieldIcons.checkedInYes
    : appointmentFieldIcons.checkedInNo;
  const BookingDdIcon = appointment.isConfirmed
    ? appointmentFieldIcons.bookingConfirmedYes
    : appointmentFieldIcons.bookingConfirmedNo;
  const ReminderDdIcon = appointmentFieldIcons.reminder;
  const DynoStatusIcon = appointmentFieldIcons.dyno;
  const WaiterBannerIcon = appointmentFieldIcons.waiter;

  return (
    <div className="flex flex-col gap-1 text-xs leading-tight">
      <div>
        <h4 className="text-sm font-semibold leading-tight">{appointment.customer}</h4>
        <TechnicianHoverLine name={technicianDisplay.name} colorKey={technicianDisplay.colorKey} />
      </div>

      {rawStatus === 'Waiter' ? (
        <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-xs border border-primary-deep bg-primary-deep px-1 py-0.5 text-xs font-medium leading-none text-primary-foreground">
          <WaiterBannerIcon className="size-3 shrink-0 opacity-95" aria-hidden />
          Waiter
        </div>
      ) : null}

      <dl className="grid grid-cols-[5rem_1fr] gap-x-1.5 gap-y-px [&_dt]:text-muted-foreground">
        {rawStatus === 'Dyno' ? (
          <>
            <dt>Status</dt>
            <dd className="flex items-center gap-1 font-medium text-action">
              <DynoStatusIcon className="size-3.5 shrink-0 opacity-95" aria-hidden />
              Dyno
            </dd>
          </>
        ) : null}
        <dt>Checked in</dt>
        <dd
          className={cn(
            'inline-flex w-fit max-w-full items-center gap-1 px-0.5 py-px text-xs font-semibold leading-none',
            appointment.checkedIn
              ? 'bg-success text-primary-foreground'
              : 'bg-destructive text-destructive-foreground'
          )}
        >
          <CheckedInDdIcon className="size-3 shrink-0 opacity-95" aria-hidden />
          {appointment.checkedIn ? 'Checked In' : 'Need Bike'}
        </dd>
        <dt>Booking</dt>
        <dd
          className={cn(
            'inline-flex w-fit max-w-full items-center gap-1 px-1 py-0.5 text-xs font-medium leading-none',
            appointment.isConfirmed
              ? 'bg-success text-primary-foreground'
              : 'bg-muted-foreground text-primary-foreground'
          )}
        >
          <BookingDdIcon className="size-3 shrink-0 opacity-95" aria-hidden />
          {appointment.isConfirmed ? 'Confirmed' : 'Pending'}
        </dd>
        <dt>Reminder</dt>
        <dd
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            appointment.reminded ? 'text-success-subtle-foreground' : 'text-destructive'
          )}
        >
          <ReminderDdIcon className="size-3.5 shrink-0 opacity-90" aria-hidden />
          {appointment.reminded ? 'Sent' : 'Not sent'}
        </dd>
      </dl>

      <Separator className="my-0.5" />

      <div className="space-y-0.5">
        <p>
          <span className="text-muted-foreground">Phone </span>
          <span className="tabular-nums">{formatPhone(appointment.phone) || '—'}</span>
        </p>
        {appointment.email?.trim() ? (
          <p className="break-all">
            <span className="text-muted-foreground">Email </span>
            {appointment.email.trim()}
          </p>
        ) : null}
        <p>
          <span className="text-muted-foreground">Vehicle </span>
          {appointment.vehicle?.trim() || '—'}
        </p>
        <p className="whitespace-pre-wrap break-words">
          <span className="text-muted-foreground">Service </span>
          {appointment.service?.trim() || '—'}
        </p>
      </div>

      <Separator className="my-0.5" />

      <p className="tabular-nums text-foreground">
        {startTime} → {endTime}
        {appointment.duration != null && appointment.duration > 0 ? (
          <span className="text-muted-foreground"> · {appointment.duration} h</span>
        ) : null}
      </p>

      {appointment.end ? (
        <p>
          <span className="text-muted-foreground">Promised </span>
          {moment(appointment.end).format('MMM D, YYYY')}
        </p>
      ) : null}

      {appointment.notes?.trim() ? (
        <>
          <Separator className="my-0.5" />
          <div>
            <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">Notes</span>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{appointment.notes.trim()}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
