import moment from 'moment';
import type { FC } from 'react';
import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type ScheduleDayMonthRailProps = {
  currentDate: Date;
  onSelectDay: (date: Date) => void;
  className?: string;
};

/** DayPicker shows `numberOfMonths` consecutive months starting at `defaultMonth` (prev / anchor / next). */
const MONTH_STRIP_COUNT = 3;

const miniCalendarClassNames = {
  months: 'flex w-full flex-col gap-2',
  month: 'w-full space-y-1',
  caption: 'flex justify-center pb-1 pt-0 relative items-center',
  caption_label: 'text-xs font-medium text-foreground',
  nav: 'hidden',
  table: 'w-full max-w-full border-collapse',
  head_row: 'flex',
  head_cell:
    'text-muted-foreground min-w-0 shrink basis-0 grow text-center font-normal text-[0.65rem]',
  row: 'mt-1 flex w-full min-w-0',
  cell: 'relative h-7 min-w-0 shrink basis-0 grow p-0 text-center text-xs focus-within:relative focus-within:z-20',
  day: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-7 w-full min-w-0 max-w-none rounded-sm p-0 text-xs font-normal aria-selected:opacity-100'
  ),
  day_selected:
    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
  day_today: 'bg-accent text-accent-foreground',
  /** Avoid primary “selected” on filler days from adjacent months (same date can appear twice in multi-month). */
  day_outside:
    'day-outside text-muted-foreground opacity-70 aria-selected:!bg-transparent aria-selected:!text-muted-foreground aria-selected:hover:!bg-transparent',
  day_disabled: 'text-muted-foreground opacity-40',
  day_hidden: 'invisible',
};

/**
 * Day view companion: a single DayPicker with three consecutive months (previous, current, next
 * relative to the schedule date) via `numberOfMonths`.
 */
export const ScheduleDayMonthRail: FC<ScheduleDayMonthRailProps> = ({
  currentDate,
  onSelectDay,
  className,
}) => {
  /** First month in the 3-month strip (always month before the schedule anchor). */
  const firstVisibleMonth = useMemo(
    () => moment(currentDate).startOf('month').subtract(1, 'month').toDate(),
    [currentDate]
  );

  return (
    <aside
      className={cn(
        'hidden md:flex',
        'w-[15rem] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r bg-muted/30 px-1.5 py-2',
        className
      )}
      aria-label="Quick month navigation"
    >
      <Calendar
        mode="single"
        numberOfMonths={MONTH_STRIP_COUNT}
        showOutsideDays={false}
        month={firstVisibleMonth}
        onMonthChange={
          // Nav is hidden; `month` is driven by the schedule date only.
          () => undefined
        }
        selected={currentDate}
        onSelect={d => {
          if (d) onSelectDay(d);
        }}
        className="w-full max-w-full rounded-md border bg-card px-1.5 py-2 shadow-sm"
        classNames={miniCalendarClassNames}
      />
    </aside>
  );
};
