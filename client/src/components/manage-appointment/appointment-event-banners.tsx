import type { Appointment } from '@shared/appointment';
import { cn } from '@/lib/utils';
import { AppointmentStatus, type AppointmentStatus as AppointmentStatusKind } from './appointment-status';
import { appointmentFieldIcons } from './appointment-display-icons';

/**
 * Day/week **regular** calendar cells only (`RegularEvent`).
 * Vacation and recurring-block cards (`VacationEvent`, `RecurringBlockEvent`) use their own shells;
 * keep those layouts separate from this stack.
 */
export interface AppointmentEventBannersProps {
  /** Appointment slice used by strips; callers typically pass `appointment` unchanged. */
  appointment: Pick<Appointment, 'status' | 'checkedIn' | 'isConfirmed'>;
  /** Wrapper around the stacked strips only. */
  className?: string;
}

/**
 * Top-of-card banners for **`RegularEvent`** (`schedule/calendar-wrappers/regular-event.tsx`):
 * `AppointmentStatus` strips plus booking Confirmed/Pending when the bike is not checked in.
 */
export function AppointmentEventBanners({ appointment, className }: AppointmentEventBannersProps) {
  const status = (appointment.status ?? '') as AppointmentStatusKind;
  const checkedIn = Boolean(appointment.checkedIn);
  const isConfirmed = Boolean(appointment.isConfirmed);
  const BookingStripIcon = isConfirmed
    ? appointmentFieldIcons.bookingConfirmedYes
    : appointmentFieldIcons.bookingConfirmedNo;

  return (
    <div className={cn('flex min-w-0 w-full flex-col', className)}>
      <AppointmentStatus status={status} checkedIn={checkedIn} />

      {!checkedIn ? (
        <div
          className={cn(
            'flex w-full min-w-0 shrink-0 items-center gap-1 whitespace-nowrap px-0.5 py-px text-xs font-medium leading-none',
            isConfirmed
              ? 'bg-success text-primary-foreground'
              : 'bg-muted-foreground text-primary-foreground'
          )}
        >
          <BookingStripIcon className="size-3 shrink-0 opacity-95" aria-hidden />
          {isConfirmed ? 'Confirmed' : 'Pending'}
        </div>
      ) : null}
    </div>
  );
}
