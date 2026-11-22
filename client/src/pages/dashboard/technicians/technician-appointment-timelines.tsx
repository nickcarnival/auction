import { useMemo } from 'react';
import moment from 'moment';
import type { Appointment } from '@shared/appointment';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import {
  bucketScheduledByDayDetailed,
  bucketScheduledByWeekDetailed,
} from './technician-timeline-utils';

const LIST_LIMIT = 12;

function formatJobLine(a: Appointment): string {
  const t = a.start ? moment(a.start).format('h:mm A') : '—';
  const who = (a.customer ?? '').trim() || 'Customer';
  return `${t} — ${who}`;
}

function ChartHelp({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded-xs text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`About: ${label}`}
        >
          <HelpCircle className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[min(20rem,calc(100vw-2rem))] space-y-1.5 p-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function BarTooltipContent({
  title,
  count,
  appointments,
  emptyHint,
}: {
  title: string;
  count: number;
  appointments: Appointment[];
  emptyHint: string;
}) {
  const lines = appointments.slice(0, LIST_LIMIT).map(a => formatJobLine(a));
  const rest = appointments.length - LIST_LIMIT;

  return (
    <div className="max-w-[min(18rem,calc(100vw-2rem))] space-y-2 p-1">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {count === 0 ? emptyHint : `${count} scheduled job${count === 1 ? '' : 's'} for this technician.`}
        </p>
      </div>
      {count > 0 && lines.length > 0 ? (
        <ul className="max-h-48 list-none space-y-1 overflow-y-auto border-t border-border pt-2 text-xs text-foreground">
          {lines.map((line, i) => (
            <li key={i} className="truncate font-mono leading-snug tabular-nums">
              {line}
            </li>
          ))}
          {rest > 0 ? (
            <li className="pt-1 text-muted-foreground">+{rest} more in this period…</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

type DailyTimelineProps = {
  appointments: Appointment[];
  daysBefore?: number;
  daysAfter?: number;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function TechnicianDailyTimeline({
  appointments,
  daysBefore = 15,
  daysAfter = 15,
  title = 'Daily jobs',
  subtitle = 'Each bar is one day. Hover for counts and the list of jobs that day.',
  className,
}: DailyTimelineProps) {
  const today = moment().startOf('day');
  const rangeStart = today.clone().subtract(daysBefore, 'days').startOf('day');
  const dayCount = daysBefore + 1 + daysAfter;

  const buckets = useMemo(
    () => bucketScheduledByDayDetailed(appointments, rangeStart, dayCount),
    [appointments, rangeStart, dayCount]
  );

  const max = useMemo(
    () => Math.max(1, ...buckets.map(b => b.appointments.length)),
    [buckets]
  );
  const todayIndex = daysBefore;

  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs leading-snug text-muted-foreground">{subtitle}</p>
        </div>
        <ChartHelp
          label="Daily chart"
          body="Bars use your browser’s local timezone. Past days are dimmed; today uses a solid color. Height is relative to the busiest day in this 31-day window. Vacation blocks are not included. Data matches the same roughly ±30 day range as the main calendar load."
        />
      </div>
      <div className="space-y-2">
        <div className="flex h-28 items-stretch gap-px sm:h-32">
          {buckets.map((b, i) => {
            const count = b.appointments.length;
            const pct = max > 0 ? (count / max) * 100 : 0;
            const isToday = i === todayIndex;
            const isPast = b.date.isBefore(today, 'day');
            const barPct = count === 0 ? 8 : Math.max(pct, 10);
            return (
              <Tooltip key={b.date.format('YYYY-MM-DD')} delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex min-h-0 min-w-0 flex-1 flex-col justify-end rounded-none bg-transparent p-0 outline-none ring-offset-background hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring',
                      isToday && 'relative z-[1] ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t-[2px] transition-opacity',
                        count === 0 && 'min-h-[6px] bg-muted/50',
                        count > 0 && isPast && 'bg-muted-foreground/45',
                        count > 0 && !isPast && !isToday && 'bg-primary/45',
                        count > 0 && isToday && 'bg-primary'
                      )}
                      style={{ height: `${barPct}%` }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="border-border bg-popover p-2 shadow-lg">
                  <BarTooltipContent
                    title={b.date.format('dddd, MMMM D, YYYY')}
                    count={count}
                    appointments={b.appointments}
                    emptyHint="No scheduled jobs for this technician on this day."
                  />
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{rangeStart.format('MMM D')}</span>
          <span>Today</span>
          <span>{rangeStart.clone().add(dayCount - 1, 'days').format('MMM D')}</span>
        </div>
      </div>
    </section>
  );
}

type WeeklyTimelineProps = {
  appointments: Appointment[];
  weeksBefore?: number;
  weeksAfter?: number;
  title?: string;
  subtitle?: string;
  className?: string;
};

export function TechnicianWeeklyTimeline({
  appointments,
  weeksBefore = 4,
  weeksAfter = 4,
  title = 'Weekly jobs',
  subtitle = 'Each bar is a calendar week. Hover for the date range and jobs.',
  className,
}: WeeklyTimelineProps) {
  const today = moment().startOf('day');
  const thisWeekStart = today.clone().startOf('week');
  const firstWeekStart = thisWeekStart.clone().subtract(weeksBefore, 'weeks');
  const numWeeks = weeksBefore + 1 + weeksAfter;

  const buckets = useMemo(
    () => bucketScheduledByWeekDetailed(appointments, firstWeekStart, numWeeks),
    [appointments, firstWeekStart, numWeeks]
  );

  const max = useMemo(
    () => Math.max(1, ...buckets.map(b => b.appointments.length)),
    [buckets]
  );
  const thisWeekIndex = weeksBefore;
  const lastWeekStart = firstWeekStart.clone().add(numWeeks - 1, 'weeks');

  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs leading-snug text-muted-foreground">{subtitle}</p>
        </div>
        <ChartHelp
          label="Weekly chart"
          body="Weeks follow your locale’s calendar (same as moment’s startOf week). The highlighted week contains today. Each bar’s height is relative to the busiest week shown. Hover to see every job in that week with time and customer name."
        />
      </div>
      <div className="space-y-2">
        <div className="flex h-28 items-stretch gap-1 sm:h-32">
          {buckets.map((b, i) => {
            const count = b.appointments.length;
            const pct = max > 0 ? (count / max) * 100 : 0;
            const isThisWeek = i === thisWeekIndex;
            const wEnd = b.weekStart.clone().endOf('week');
            const barPct = count === 0 ? 8 : Math.max(pct, 10);
            return (
              <Tooltip key={b.weekStart.format('YYYY-MM-DD')} delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'flex min-h-0 min-w-0 flex-1 flex-col justify-end rounded-none bg-transparent p-0 outline-none ring-offset-background hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring',
                      isThisWeek &&
                        'relative z-[1] ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t-[2px] transition-opacity',
                        count === 0 && 'min-h-[6px] bg-muted/50',
                        count > 0 && !isThisWeek && 'bg-primary/45',
                        count > 0 && isThisWeek && 'bg-primary'
                      )}
                      style={{ height: `${barPct}%` }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="border-border bg-popover p-2 shadow-lg">
                  <BarTooltipContent
                    title={`${b.weekStart.format('MMM D')} – ${wEnd.format('MMM D, YYYY')}`}
                    count={count}
                    appointments={b.appointments}
                    emptyHint="No scheduled jobs for this technician in this week."
                  />
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{firstWeekStart.format('MMM D')}</span>
          <span className="text-center">This week ringed</span>
          <span>{lastWeekStart.format('MMM D')}</span>
        </div>
      </div>
    </section>
  );
}
