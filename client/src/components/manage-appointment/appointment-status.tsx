import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { appointmentFieldIcons } from './appointment-display-icons';

export type AppointmentStatus =
  | 'Checked In'
  | 'Awaiting Bike'
  | 'Dyno'
  | 'Vacation'
  | 'Waiter'
  | '';

interface AppointmentStatusProps {
  status: AppointmentStatus;
  checkedIn?: boolean;
  className?: string;
}

const statusConfig = {
  'Checked In': {
    bgColor: 'bg-success',
    textColor: 'text-primary-foreground',
  },
  'Awaiting Bike': {
    bgColor: 'bg-destructive',
    textColor: 'text-destructive-foreground',
  },
  '': {
    bgColor: 'bg-destructive',
    textColor: 'text-destructive-foreground',
  },
} as const;

/** Shared diagonal hatch used for vacation (modal swatch + calendar strip). */
export function VacationDiagonalSwatch({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-sm border border-border bg-muted/80', className)}
      style={{
        backgroundImage: `repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 3px,
          hsl(var(--foreground) / 0.14) 3px,
          hsl(var(--foreground) / 0.14) 4px
        )`,
      }}
      aria-hidden
    />
  );
}

/**
 * Tailwind-friendly swatch for selects: Dyno = blue; Waiter = muted stripe.
 */
export function appointmentStatusSwatchClass(status: string | undefined | null): string {
  const s = (status ?? '').trim();
  if (s === 'Dyno') return 'bg-action';
  if (s === 'Waiter') return 'bg-primary-deep border border-primary-deep';
  if (s === '' || s === 'None') return 'bg-muted border border-input';
  return 'bg-muted border border-input';
}

export function AppointmentStatus({
  status,
  checkedIn = false,
  className,
}: AppointmentStatusProps) {
  const containerClassName = useMemo(() => {
    if (status === 'Vacation') {
      return cn(
        'flex min-w-0 w-full items-center gap-1.5 overflow-hidden border-b border-border bg-background/85 px-0.5 py-px backdrop-blur-[1px]',
        className
      );
    }

    const mainStatus = checkedIn ? 'Checked In' : '';
    return cn(
      'flex min-w-0 w-full flex-col',
      statusConfig[mainStatus].bgColor,
      statusConfig[mainStatus].textColor,
      className
    );
  }, [status, checkedIn, className]);

  if (status === 'Vacation') {
    const VacationIcon = appointmentFieldIcons.vacation;
    return (
      <div className={cn(containerClassName, 'min-w-0 overflow-hidden')}>
        <VacationDiagonalSwatch className="h-3.5 w-3.5 shrink-0" />
        <VacationIcon
          className="size-3 shrink-0 text-status-vacation"
          aria-hidden
        />
        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-clip text-xs font-medium leading-none text-foreground">
          Vacation
        </span>
      </div>
    );
  }

  const CheckedInStripIcon = checkedIn
    ? appointmentFieldIcons.checkedInYes
    : appointmentFieldIcons.checkedInNo;
  const DynoStripIcon = appointmentFieldIcons.dyno;
  const WaiterStripIcon = appointmentFieldIcons.waiter;

  return (
    <div className={cn(containerClassName, 'min-w-0')}>
      {status === 'Waiter' && (
        <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden border-b border-primary-deep bg-primary-deep px-0.5 py-px text-xs font-medium leading-none text-primary-foreground">
          <WaiterStripIcon className="size-3 shrink-0 opacity-95" aria-hidden />
          <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-clip">Waiter</span>
        </div>
      )}
      <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden px-0.5 py-px text-xs font-medium leading-none">
        <CheckedInStripIcon className="size-3 shrink-0 opacity-95" aria-hidden />
        <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-clip">
          {checkedIn ? 'Checked In' : 'Need Bike'}
        </span>
      </div>
      {status === 'Dyno' && (
        <div className="flex w-full min-w-0 items-center gap-1 overflow-hidden bg-action px-0.5 py-px text-xs font-medium leading-none text-primary-foreground">
          <DynoStripIcon className="size-3 shrink-0 opacity-95" aria-hidden />
          <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-clip">Dyno</span>
        </div>
      )}
    </div>
  );
}
