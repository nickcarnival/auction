import moment from 'moment';
import { CalendarHeart } from 'lucide-react';
import type { TenantClosedDayDisplay } from '@shared/holidays/tenant-closed-dates';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type DynoDayStatus = {
  dynos: number;
  appointments: Array<{ customer: string; start: string; actualEnd: string }>;
};

export type ScheduleWorkWeekDayHeaderProps = {
  date: Date;
  dynoStatus: DynoDayStatus | undefined;
  closedDay: TenantClosedDayDisplay | undefined;
};

/** Work-week column header: Dyno warnings + shop closed day + date label. */
export function ScheduleWorkWeekDayHeader({ date, dynoStatus, closedDay }: ScheduleWorkWeekDayHeaderProps) {
  const status = dynoStatus && dynoStatus.dynos > 0 ? dynoStatus : undefined;

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center gap-2">
        {status ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className={cn(
                    'text-sm flex items-center gap-1 rounded-md px-1.5 py-px transition-colors',
                    status.dynos > 1
                      ? 'bg-destructive hover:bg-destructive/90 animate-pulse text-destructive-foreground'
                      : 'bg-action text-primary-foreground hover:bg-action-hover'
                  )}
                >
                  <span className="font-bold">
                    {status.dynos > 1 ? '⚠️ ' : ''}Dyno ({status.dynos})
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className={status.dynos > 1 ? 'text-destructive font-bold' : ''}>
                  {status.dynos > 1
                    ? '⚠️ Multiple Dyno Appointments!'
                    : `Dyno Appointments: ${status.dynos}`}
                </p>
                {status.dynos > 1 ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold">Appointments:</p>
                    {status.appointments.map((appointment, index) => (
                      <div key={index} className="text-xs">
                        <span className="font-medium">{appointment.customer}</span>
                        <br />
                        <span className="text-muted-foreground">
                          {moment(appointment.start).format('MM/DD/YYYY')} -{' '}
                          {moment(appointment.actualEnd).format('MM/DD/YYYY')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          {closedDay ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 rounded-sm text-info-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Shop closed: ${closedDay.label}`}
                  >
                    <CalendarHeart className="size-3" strokeWidth={2} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{closedDay.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          <span className="whitespace-nowrap">{moment(date).format('ddd MM/DD/YYYY')}</span>
        </div>
      </div>
    </div>
  );
}
