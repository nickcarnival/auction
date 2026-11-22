import { useMemo, type ComponentType } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import {
  DateLocalizer,
  Navigate,
  NavigateAction,
  TitleOptions,
  ViewStatic,
  type TimeGridProps,
} from 'react-big-calendar';
import TimeGrid from 'react-big-calendar/lib/TimeGrid';
import { useShopHours } from '@/contexts/tenant-context';
import { getWorkWeekDatesForTenant } from '@/utils/work-week-range';

type CustomWorkWeekProps = TimeGridProps & {
  date: Date;
  localizer: DateLocalizer;
};

function getTenantWorkWeekRange(
  localizer: DateLocalizer,
  baseDate: Date,
  daysOpen: number[]
): Date[] {
  const dayOfWeek = baseDate.getDay();
  const startOfWeek = localizer.add(localizer.startOf(baseDate, 'day'), -dayOfWeek, 'day');
  const workDays: Date[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    if (daysOpen.includes(dayIndex)) {
      const workDay = localizer.add(startOfWeek, dayIndex, 'day');
      workDays.push(workDay);
    }
  }

  if (workDays.length === 0) {
    for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
      const workDay = localizer.add(startOfWeek, dayIndex, 'day');
      workDays.push(workDay);
    }
  }

  return workDays;
}

function workWeekStaticRange(date: Date, { localizer }: { localizer: DateLocalizer }): Date[] {
  return getTenantWorkWeekRange(localizer, date, [1, 2, 3, 4, 5]);
}

function workWeekNavigate(
  date: Date,
  action: NavigateAction,
  { localizer }: { localizer: DateLocalizer }
): Date {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -7, 'day');
    case Navigate.NEXT:
      return localizer.add(date, 7, 'day');
    default:
      return date;
  }
}

function workWeekTitle(date: Date, options: TitleOptions): string {
  const localizer = options.localizer as DateLocalizer;
  const [start, ...rest] = workWeekStaticRange(date, { localizer });
  const endDate = rest.pop();
  if (!endDate) return localizer.format(start, 'MMM DD, YYYY');
  return localizer.format({ start, end: endDate }, 'dayRangeHeaderFormat');
}

function CustomWorkWeekView({ date, localizer, max, min, scrollToTime, ...props }: CustomWorkWeekProps) {
  const shopHours = useShopHours();
  const currRange = useMemo(() => {
    return getWorkWeekDatesForTenant(date, shopHours.daysOpen);
  }, [date, shopHours.daysOpen]);

  const safeOpenHour = shopHours.openHour;
  const safeCloseHour =
    shopHours.closeHour > shopHours.openHour ? shopHours.closeHour : shopHours.openHour + 1;

  const minTime = min || moment().startOf('day').hour(safeOpenHour).toDate();
  const maxTime = max || moment().startOf('day').hour(safeCloseHour).toDate();
  const scrollTime = scrollToTime || moment().startOf('day').hour(safeOpenHour).toDate();

  return (
    <div className="rbc-schedule-work-week flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <TimeGrid
        date={date}
        eventOffset={15}
        localizer={localizer}
        max={maxTime}
        min={minTime}
        range={currRange}
        scrollToTime={scrollTime}
        {...props}
      />
    </div>
  );
}

CustomWorkWeekView.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  localizer: PropTypes.object,
  max: PropTypes.instanceOf(Date),
  min: PropTypes.instanceOf(Date),
  scrollToTime: PropTypes.instanceOf(Date),
};

const CustomWorkWeek: ComponentType<CustomWorkWeekProps> &
  ViewStatic & {
    range: typeof workWeekStaticRange;
  } = Object.assign(CustomWorkWeekView, {
  range: workWeekStaticRange,
  navigate: workWeekNavigate,
  title: workWeekTitle,
});

export default CustomWorkWeek;
