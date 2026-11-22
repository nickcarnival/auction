import {
  Calendar,
  momentLocalizer,
  View as CalendarView,
  Components,
  Views,
  type ToolbarProps,
} from 'react-big-calendar';
import type { FC } from 'react';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAppointmentContext } from './appointment-context';
import { EventComponent } from './calendar-wrappers/event-wrapper';
import { MonthScheduleEvent } from './calendar-wrappers/month-schedule-event';
import { Resource, isSchedulableResource, sortResourcesByOrder } from '@shared/resource';
import { useResourceContext } from '../resources/resource-context';
import { AgendaWrapper } from './calendar-wrappers/agenda-wrapper';
import { useScheduleCalendar } from './use-schedule-calendar';
import {
  getEndDate,
  movePastNonWorkingDays,
  technicianWeeklyOffDaysForAppointment,
} from './duration';
import { LoadingCalendar } from './loading-calendar';
import { useShopHours, useTenant } from '@/contexts/tenant-context';
import { buildTenantClosedDayMap } from '@shared/holidays/tenant-closed-dates';
import type { Appointment } from '@shared/appointment';
import {
  expandRecurringScheduleBlocksForRange,
  isRecurringBlockCalendarAppointment,
} from '@shared/recurring-schedule-block-calendar';

import './calendar.css';
import CustomWorkWeek from './custom-work-week';
import { ScheduleCalendarToolbar } from './schedule-calendar-toolbar';
import { useForwardWheelFromRbcEvents } from './use-forward-wheel-from-rbc-events';
import { ScheduleDayMonthRail } from './schedule-day-month-rail';
import {
  ScheduleWorkWeekDayHeader,
  type DynoDayStatus,
} from './schedule-work-week-day-header';
import { ScheduleCalendarNoEventsRange } from './schedule-calendar-no-events-range';
import { ScheduleResourceHeaderLink } from './schedule-resource-header-link';
import { getWorkWeekDatesForTenant } from '@/utils/work-week-range';
import { useScheduleWeeklyOffColumnLayout } from './use-schedule-weekly-off-column-layout';
import { useSyncResourceHeaderColumnWidths } from './use-sync-resource-header-column-widths';

const localizer = momentLocalizer(moment);

/** react-big-calendar event shape + DnD wrapper (resource column model uses `Resource`). */
type CalendarEvent = {
  start: Date;
  end: Date;
  title?: string;
  resourceId?: string;
  [key: string]: unknown;
};

const DnDCalendar = withDragAndDrop<CalendarEvent, Resource>(
  Calendar as React.ComponentType<Calendar<CalendarEvent, Resource>['props']>
);

const ScheduleToolbar: FC<ToolbarProps<CalendarEvent, Resource>> = ScheduleCalendarToolbar;

/** Compact gutter labels (e.g. `9am`, `12pm`, `9:30am`) so the narrow time column doesn’t clip. */
function formatTimeGutterLabel(date: Date): string {
  const m = moment(date);
  return m.minute() === 0 ? m.format('ha') : m.format('h:mma');
}

const scheduleTimeFormats = { timeGutterFormat: formatTimeGutterLabel };

// TODO: this probably needs custom business work week logic
export default function Schedule() {
  const scheduleScrollRef = useRef<HTMLDivElement>(null);

  const {
    appointments,
    isLoadingAppointments,
    isFetchingAppointments,
    appointmentsQueryIsPlaceholder,
    appointmentsFetchAnchor,
    currentDate,
    placementRequestDraft,
  } = useAppointmentContext();

  const { resources, isLoadingResources } = useResourceContext();

  const schedulableResources = useMemo(() => {
    const active = (resources ?? []).filter(r => isSchedulableResource(r));
    return sortResourcesByOrder(active);
  }, [resources]);

  const scheduleReady = !isLoadingAppointments && !isLoadingResources;
  useForwardWheelFromRbcEvents(scheduleScrollRef, scheduleReady);
  const shopHours = useShopHours();
  const { tenant } = useTenant();

  const recurringCalendarRows = useMemo(() => {
    const blocks = tenant?.recurringScheduleBlocks;
    if (!blocks?.length) return [];
    const anchor = moment(appointmentsFetchAnchor);
    const rangeStart = anchor.clone().subtract(30, 'days').toDate();
    const rangeEnd = anchor.clone().add(30, 'days').toDate();
    const idSet = new Set<string>();
    for (const r of schedulableResources) {
      const id = r._id;
      if (id) idSet.add(id);
    }
    return expandRecurringScheduleBlocksForRange(blocks, rangeStart, rangeEnd, shopHours, idSet);
  }, [tenant?.recurringScheduleBlocks, appointmentsFetchAnchor, shopHours, schedulableResources]);

  const calendarEvents = useMemo(() => {
    const hideId = placementRequestDraft?._id?.trim();
    const base =
      hideId != null && hideId !== ''
        ? appointments.filter(a => (a._id ?? '').trim() !== hideId)
        : appointments;
    return [...recurringCalendarRows, ...base];
  }, [appointments, placementRequestDraft?._id, recurringCalendarRows]);

  const closedDayMap = useMemo(() => {
    const codes = tenant?.observedHolidayIds ?? [];
    const custom = tenant?.shopClosedDates ?? [];
    const y = moment(currentDate).year();
    return buildTenantClosedDayMap(codes, custom, [y - 1, y, y + 1]);
  }, [tenant?.observedHolidayIds, tenant?.shopClosedDates, currentDate]);

  const dayPropGetter = useCallback(
    (d: Date) => {
      const key = moment(d).format('YYYY-MM-DD');
      if (!closedDayMap.has(key)) return {};
      return { className: 'schedule-shop-closed' };
    },
    [closedDayMap]
  );

  const {
    handleNavigate,
    view,
    selectView,
    onEventResize,
    onEventDrop,
    onSelectEmptySlot,
    onSelectEvent,
    endAccessor,
    startAccessor,
  } = useScheduleCalendar();

  const technicianOffDayRange = useMemo(() => {
    if (view === Views.DAY) {
      return [moment(currentDate).startOf('day').toDate()];
    }
    return getWorkWeekDatesForTenant(currentDate, shopHours.daysOpen);
  }, [view, currentDate, shopHours.daysOpen]);

  useScheduleWeeklyOffColumnLayout({
    rootRef: scheduleScrollRef,
    enabled: scheduleReady && schedulableResources.length > 1,
    view,
    range: technicianOffDayRange,
    resources: schedulableResources,
  });

  useSyncResourceHeaderColumnWidths({
    rootRef: scheduleScrollRef,
    enabled: scheduleReady && schedulableResources.length > 1,
    view,
    rangeLength: technicianOffDayRange.length,
    resourceCount: schedulableResources.length,
  });

  const hasSpecialStatus = useMemo(() => {
    const statusMap = new Map<string, DynoDayStatus>();

    calendarEvents.forEach(appointment => {
      if (appointment.status === 'Dyno') {
        const _start = moment(appointment.start);
        const techOff = technicianWeeklyOffDaysForAppointment(appointment, resources ?? undefined);
        const actualEndDate = getEndDate({
          start: appointment.start?.toString() || '',
          duration: appointment.duration || 0.5,
          shopHours,
          technicianWeeklyOffDays: techOff,
        });
        const _actualEnd = moment(actualEndDate);

        const currentDay = _start.clone();

        while (!currentDay.isSame(_actualEnd, 'day')) {
          if (movePastNonWorkingDays(currentDay, shopHours, techOff)) continue;

          const dateKey = currentDay.format('YYYY-MM-DD');
          const current = statusMap.get(dateKey) || { dynos: 0, appointments: [] };
          current.dynos += 1;
          current.appointments.push({
            customer: appointment.customer,
            start: appointment.start?.toString() || '',
            actualEnd: actualEndDate.toISOString(),
          });
          statusMap.set(dateKey, current);

          currentDay.add(1, 'days');
        }

        if (!movePastNonWorkingDays(_actualEnd.clone(), shopHours, techOff)) {
          const endDateKey = _actualEnd.format('YYYY-MM-DD');
          const current = statusMap.get(endDateKey) || { dynos: 0, appointments: [] };
          current.dynos += 1;
          current.appointments.push({
            customer: appointment.customer,
            start: appointment.start?.toString() || '',
            actualEnd: actualEndDate.toISOString(),
          });
          statusMap.set(endDateKey, current);
        }
      }
    });

    return statusMap;
  }, [calendarEvents, resources, shopHours]);

  const calendarMessages = useMemo(
    () => ({
      today: 'Today',
      previous: 'Back',
      next: 'Next',
      noEventsInRange: (
        <ScheduleCalendarNoEventsRange
          isLoading={Boolean(appointmentsQueryIsPlaceholder && isFetchingAppointments)}
        />
      ) as ReactNode as string,
    }),
    [appointmentsQueryIsPlaceholder, isFetchingAppointments]
  );

  const eventAllowsDragResize = useCallback((e: CalendarEvent) => {
    return !isRecurringBlockCalendarAppointment(e as unknown as Appointment);
  }, []);

  if (isLoadingAppointments || isLoadingResources) {
    return <LoadingCalendar />;
  }

  const workWeekDayHeader = ({ date }: { date: Date }) => {
    const dateStr = moment(date).format('YYYY-MM-DD');
    return (
      <ScheduleWorkWeekDayHeader
        date={date}
        dynoStatus={hasSpecialStatus.get(dateStr)}
        closedDay={closedDayMap.get(dateStr)}
      />
    );
  };

  const customComponents = {
    toolbar: ScheduleToolbar,
    event: EventComponent,
    month: {
      event: MonthScheduleEvent,
    },
    agenda: {
      event: AgendaWrapper,
    },
    work_week: {
      header: workWeekDayHeader,
    },
  } as unknown as Components<CalendarEvent, Resource>;

  return (
    <div
      className="flex size-full min-h-0 min-w-0 flex-row"
      data-tour="calendar-click-demo"
      data-schedule-placement={placementRequestDraft ? '' : undefined}
    >
      {view === Views.DAY ? (
        <ScheduleDayMonthRail currentDate={currentDate} onSelectDay={handleNavigate} />
      ) : null}
      <div ref={scheduleScrollRef} className="min-h-0 min-w-0 flex-1 overflow-auto pb-1">
        <DnDCalendar
          events={calendarEvents as unknown as CalendarEvent[]}
          resources={schedulableResources.length ? schedulableResources : undefined}
          resourceGroupingLayout={schedulableResources.length > 0}
          resourceIdAccessor={(resource: Resource) => resource?._id ?? ''}
          selectable
          showMultiDayTimes
          localizer={localizer}
          formats={scheduleTimeFormats}
          date={currentDate}
          defaultDate={moment().toDate()}
          resizable
          messages={calendarMessages}
          resourceTitleAccessor={(resource: Resource) => <ScheduleResourceHeaderLink resource={resource} />}
          onNavigate={handleNavigate}
          showAllEvents
          onEventResize={onEventResize}
          onEventDrop={onEventDrop}
          onSelectSlot={onSelectEmptySlot}
          onSelectEvent={onSelectEvent}
          draggableAccessor={eventAllowsDragResize}
          resizableAccessor={eventAllowsDragResize}
          length={2}
          step={30}
          min={moment().startOf('day').hour(shopHours.openHour).toDate()}
          max={moment()
            .startOf('day')
            .hour(
              shopHours.closeHour > shopHours.openHour ? shopHours.closeHour : shopHours.openHour + 1
            )
            .toDate()}
          components={customComponents}
          allDayAccessor={() => false}
          endAccessor={endAccessor}
          startAccessor={startAccessor}
          view={view as CalendarView}
          onView={selectView as (view: CalendarView) => void}
          dayPropGetter={dayPropGetter}
          views={{
            day: true,
            month: true,
            work_week: CustomWorkWeek,
          }}
        />
      </div>
    </div>
  );
}
