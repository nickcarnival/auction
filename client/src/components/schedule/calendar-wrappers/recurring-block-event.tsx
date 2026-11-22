import { Appointment } from '@shared/appointment';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useResourceContext } from '@/components/resources/resource-context';
import { getClassName } from '@/components/resources/colors';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { AppointmentHoverCardPanel } from './appointment-hover-card-panel';

interface RecurringBlockEventProps {
  appointment: Appointment;
}

/** Same diagonal hatch as recurring blocks; reused elsewhere via shared waiter surface tokens. */
export const RECURRING_BLOCK_SURFACE = `
  repeating-linear-gradient(
    -45deg,
    hsl(var(--muted-foreground) / 0.12),
    hsl(var(--muted-foreground) / 0.12) 8px,
    transparent 8px,
    transparent 16px
  ),
  hsl(var(--muted) / 0.55)
`;

export const RecurringBlockEvent = ({ appointment }: RecurringBlockEventProps) => {
  const { resources } = useResourceContext();

  const resource = useMemo(
    () => resources.find(r => r._id === appointment.resourceId),
    [resources, appointment.resourceId]
  );

  const colors = getClassName(resource?.color);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          className="schedule-event-shell flex h-full w-full flex-col overflow-hidden border-2 border-muted-foreground/35 p-0 text-sm text-foreground"
          style={{ background: RECURRING_BLOCK_SURFACE }}
        >
          <div
            className={cn(
              'border-b-2 border-muted-foreground/25 px-1 py-0.5 text-xs font-semibold',
              colors.background,
              colors.border,
              colors.foreground
            )}
          >
            <span className="block min-w-0 truncate">{resource?.name ?? 'Technician'}</span>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 px-1 py-1">
            <div className="flex min-w-0 shrink-0 items-center gap-1">
              <Repeat className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate text-xs font-semibold leading-none">
                {appointment.customer}
              </span>
            </div>
            {appointment.notes?.trim() ? (
              <p className="line-clamp-6 min-h-0 min-w-0 flex-1 break-words text-xs leading-snug text-muted-foreground">
                {appointment.notes}
              </p>
            ) : null}
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="p-3 max-h-[350px] overflow-y-auto" side="right">
        <AppointmentHoverCardPanel appointment={appointment} />
      </HoverCardContent>
    </HoverCard>
  );
};
