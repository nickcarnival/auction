import { Loader2 } from 'lucide-react';

type ScheduleCalendarNoEventsRangeProps = {
  /** True while the agenda range is showing placeholder data and a refetch is in flight. */
  isLoading: boolean;
};

/** react-big-calendar `messages.noEventsInRange` body (loading vs empty). */
export function ScheduleCalendarNoEventsRange({ isLoading }: ScheduleCalendarNoEventsRangeProps) {
  if (isLoading) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-none border-2 border-dashed border-muted p-10"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="text-lg text-muted-foreground">Loading appointments…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center rounded-none border-2 p-10">
      <span className="text-xl">There are no appointments within these dates...</span>
    </div>
  );
}
