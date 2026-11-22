import { useMemo } from 'react';
import moment from 'moment';
import type { Appointment } from '@shared/appointment';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { scheduleFocusAppointmentHref } from '@/lib/schedule-focus-url';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router';

type TechnicianTodayWorkProps = {
  appointments: Appointment[];
  className?: string;
};

function TodayHelp() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded-xs text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="About today's list"
        >
          <HelpCircle className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[min(20rem,calc(100vw-2rem))] space-y-1.5 p-3">
        <p className="text-sm font-medium text-foreground">Today’s schedule</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Jobs where this technician is assigned and the start time falls on today in your browser’s
          timezone. Same “scheduled job” rules as the charts (vacation blocks excluded). Times are
          start times from the calendar.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TechnicianTodayWork({ appointments, className }: TechnicianTodayWorkProps) {
  const todayJobs = useMemo(() => {
    const today = moment().startOf('day');
    return [...appointments]
      .filter(a => {
        if (!a.start) return false;
        const s = moment(a.start);
        return s.isValid() && s.isSame(today, 'day');
      })
      .sort((a, b) => {
        const ta = a.start ? moment(a.start).valueOf() : 0;
        const tb = b.start ? moment(b.start).valueOf() : 0;
        return ta - tb;
      });
  }, [appointments]);

  const todayLabel = moment().format('dddd, MMMM D');

  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">Today</h3>
          <p className="text-xs text-muted-foreground">
            {todayLabel} · {todayJobs.length} job
            {todayJobs.length === 1 ? '' : 's'}
          </p>
        </div>
        <TodayHelp />
      </div>
      {todayJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing on the calendar for this technician today.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-muted/30">
          {todayJobs.map(a => {
            const rowKey = a._id ?? `${a.start}-${a.customer}`;
            const apptId = a._id?.trim();
            const startLabel = a.start ? moment(a.start).format('h:mm A') : '—';
            const extra = [a.vehicle?.trim(), a.service?.trim()].filter(Boolean).join(' · ');
            const scheduleHref = apptId ? scheduleFocusAppointmentHref(apptId, a.start) : null;
            const customerLabel = (a.customer ?? '').trim() || 'Customer';
            const rowInner = (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {startLabel}
                  </span>
                  <span className="min-w-0 flex-1 text-right text-sm text-foreground">
                    {customerLabel}
                  </span>
                </div>
                {extra ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{extra}</p>
                ) : null}
              </>
            );
            return (
              <li key={rowKey}>
                {scheduleHref ? (
                  <Link
                    to={scheduleHref}
                    aria-label={`Open ${customerLabel} on the schedule (${startLabel})`}
                    className="block cursor-pointer px-3 py-2.5 no-underline outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    {rowInner}
                  </Link>
                ) : (
                  <div className="px-3 py-2.5">{rowInner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
