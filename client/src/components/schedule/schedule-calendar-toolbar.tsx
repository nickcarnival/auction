import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Resource } from '@shared/resource';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Navigate, ToolbarProps, View } from 'react-big-calendar';

/** Aligns with `CalendarEvent` in schedule-calendar (RBC generics). */
type ScheduleToolbarEvent = {
  start: Date;
  end: Date;
  title?: string;
  resourceId?: string;
  [key: string]: unknown;
};

function viewNameList(views: ToolbarProps<ScheduleToolbarEvent, Resource>['views']): View[] {
  if (Array.isArray(views)) {
    return views as View[];
  }
  if (views && typeof views === 'object') {
    return (Object.keys(views) as View[]).filter(
      k => Boolean((views as Record<string, unknown>)[k as string])
    );
  }
  return [];
}

/**
 * Schedule navigation:
 * - **`lg` and up:** Today · Back · Next (text), chevrons + range label, view switcher.
 * - **Below `lg`:** Today to the left of chevrons + range label (one row); view switcher hidden.
 */
export function ScheduleCalendarToolbar(props: ToolbarProps<ScheduleToolbarEvent, Resource>) {
  const { label, localizer, onNavigate, onView, view, views } = props;
  const { messages } = localizer;
  const viewNames = viewNameList(views);

  const labelForView = (name: View): string => {
    const m = messages as Record<string, string>;
    return m[name] ?? name;
  };

  const hasViewSwitch = viewNames.length > 1;

  const textNav = (
    <span className="rbc-btn-group rbc-toolbar-nav lg:justify-self-start">
      <button type="button" onClick={() => onNavigate(Navigate.TODAY)}>
        {messages.today}
      </button>
      <button type="button" onClick={() => onNavigate(Navigate.PREVIOUS)}>
        {messages.previous}
      </button>
      <button type="button" onClick={() => onNavigate(Navigate.NEXT)}>
        {messages.next}
      </button>
    </span>
  );

  const todayOnlyMobile = (
    <span className="rbc-btn-group rbc-toolbar-nav shrink-0">
      <button type="button" onClick={() => onNavigate(Navigate.TODAY)}>
        {messages.today}
      </button>
    </span>
  );

  const chevronNav = (
    <div className="schedule-toolbar-range flex min-w-0 items-center justify-center gap-0.5 sm:gap-1 lg:mx-auto lg:max-w-[min(100%,36rem)]">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="schedule-toolbar-chevron-btn h-9 w-9 shrink-0"
        onClick={() => onNavigate(Navigate.PREVIOUS)}
        aria-label={messages.previous}
      >
        <ChevronLeft className="mx-auto size-4" aria-hidden />
      </Button>
      <span
        className={cn(
          'rbc-toolbar-label !flex-grow-0 px-1 text-center tabular-nums',
          'block w-[18rem] max-lg:max-w-[calc(100vw-9.5rem)] shrink-0 truncate'
        )}
      >
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="schedule-toolbar-chevron-btn h-9 w-9 shrink-0"
        onClick={() => onNavigate(Navigate.NEXT)}
        aria-label={messages.next}
      >
        <ChevronRight className="mx-auto size-4" aria-hidden />
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        'rbc-toolbar schedule-toolbar w-full gap-2',
        'flex flex-row items-center lg:grid lg:items-center',
        hasViewSwitch
          ? 'lg:grid-cols-[auto_minmax(0,1fr)_auto]'
          : 'lg:grid-cols-[auto_minmax(0,1fr)]'
      )}
    >
      <div className="hidden lg:block">{textNav}</div>

      <div className="flex min-w-0 flex-1 items-center gap-2 lg:contents">
        <div className="shrink-0 lg:hidden">{todayOnlyMobile}</div>
        <div className="flex min-w-0 flex-1 justify-center lg:flex lg:w-auto lg:max-w-[min(100%,36rem)] lg:flex-initial lg:justify-self-center">
          {chevronNav}
        </div>
      </div>

      {hasViewSwitch ? (
        <span className="rbc-btn-group rbc-toolbar-view-switch hidden lg:inline-flex lg:justify-self-end">
          {viewNames.map(name => (
            <button
              key={name}
              type="button"
              className={cn(view === name && 'rbc-active')}
              onClick={() => onView(name)}
            >
              {labelForView(name)}
            </button>
          ))}
        </span>
      ) : null}
    </div>
  );
}
