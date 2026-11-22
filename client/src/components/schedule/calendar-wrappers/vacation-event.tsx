import { Appointment } from '@shared/appointment';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useResourceContext } from '@/components/resources/resource-context';
import { getClassName } from '@/components/resources/colors';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Palmtree } from 'lucide-react';
import { AppointmentHoverCardPanel } from './appointment-hover-card-panel';

interface VacationEventProps {
  appointment: Appointment;
}

/** Lavender hatch + border unchanged from original vacation card; only the top band uses technician chip colors. */
const VACATION_CARD_BACKGROUND = `
  repeating-linear-gradient(
    45deg,
    hsl(var(--foreground) / 0.1),
    hsl(var(--foreground) / 0.1) 10px,
    transparent 10px,
    transparent 20px
  ),
  hsl(var(--vacation-card-surface))
`;

export const VacationEvent = ({ appointment }: VacationEventProps) => {
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
          className="schedule-event-shell flex h-full w-full flex-col overflow-hidden border-2 border-foreground p-0 text-sm text-foreground"
          style={{ background: VACATION_CARD_BACKGROUND }}
        >
          <div
            className={cn(
              'border-b-2 border-foreground px-1 py-0.5 text-xs font-semibold',
              colors.background,
              colors.border,
              colors.foreground
            )}
          >
            <span className="block min-w-0 truncate">{resource?.name ?? 'Technician'}</span>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 px-1 py-1">
            <div className="flex min-w-0 shrink-0 items-center gap-1">
              <Palmtree
                className="size-3.5 shrink-0 text-status-vacation"
                aria-hidden
              />
              <span className="text-xs font-semibold leading-none text-status-vacation">
                Vacation
              </span>
            </div>
            {appointment.notes?.trim() ? (
              <p className="min-h-0 min-w-0 flex-1 break-words text-xs leading-snug text-muted-foreground line-clamp-8">
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
