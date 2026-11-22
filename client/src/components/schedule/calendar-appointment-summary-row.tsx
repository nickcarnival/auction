import { Badge } from '@/components/ui/badge';
import { TechnicianColorSwatch } from '@/components/resources/technician-color-swatch';
import moment from 'moment';

export function formatCalendarAppointmentTimeRange(startRaw?: string, endRaw?: string): string {
  const s = startRaw?.trim() ? moment(startRaw) : null;
  const e = endRaw?.trim() ? moment(endRaw) : null;
  if (s?.isValid() && e?.isValid()) {
    if (s.isSame(e, 'day')) {
      return `${s.format('MM/DD/YYYY')} · ${s.format('h:mm A')}–${e.format('h:mm A')}`;
    }
    return `${s.format('MM/DD/YYYY h:mm A')} → ${e.format('MM/DD/YYYY h:mm A')}`;
  }
  if (s?.isValid()) {
    return s.format('MM/DD/YYYY h:mm A');
  }
  if (e?.isValid()) {
    return e.format('MM/DD/YYYY h:mm A');
  }
  return '—';
}

export function formatAppointmentDurationHours(d?: number): string {
  if (d == null || Number.isNaN(d)) {
    return '—';
  }
  const rounded = Math.round(d * 10) / 10;
  return `${rounded} h`;
}

export type CalendarAppointmentSummaryRowProps = {
  onOpenOnSchedule: () => void;
  disabled?: boolean;
  /** When true, show green “Confirmed”; otherwise “Unconfirmed” (request drawer convention). */
  isConfirmed: boolean;
  technicianName?: string | null;
  /** Resource color key (e.g. `Blue`, `Teal`) for calendar chip styling */
  technicianColorKey?: string | null;
  durationHours?: number;
  start?: string;
  end?: string;
  /**
   * Optional middle line (e.g. service / booking title). Request drawer omits this; customer list
   * can pass the service label.
   */
  primaryLabel?: string | null;
  notes?: string | null;
  ariaLabel: string;
};

/**
 * Compact “On calendar” row: status, technician + color swatch, duration, optional title, time range.
 * Matches the notifications request drawer linked-appointment UI.
 */
export function CalendarAppointmentSummaryRow({
  onOpenOnSchedule,
  disabled = false,
  isConfirmed,
  technicianName,
  technicianColorKey,
  durationHours,
  start,
  end,
  primaryLabel,
  notes,
  ariaLabel,
}: CalendarAppointmentSummaryRowProps) {
  const tech = technicianName?.trim();
  const dur = formatAppointmentDurationHours(durationHours);
  const timeLine = formatCalendarAppointmentTimeRange(start, end);

  return (
    <li className="rounded-md border border-border bg-muted/25 leading-tight">
      <button
        type="button"
        onClick={onOpenOnSchedule}
        disabled={disabled}
        aria-label={ariaLabel}
        className="w-full rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {isConfirmed ? (
            <Badge className="h-5 shrink-0 bg-success px-1.5 py-0 text-xs font-normal text-primary-foreground">
              Confirmed
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-5 shrink-0 border-muted-foreground/25 px-1.5 py-0 text-xs font-normal text-muted-foreground"
            >
              Unconfirmed
            </Badge>
          )}
          {tech ? (
            <span className="flex min-w-0 max-w-[55%] items-center gap-1.5">
              <TechnicianColorSwatch colorKey={technicianColorKey} />
              <span className="min-w-0 truncate text-xs text-foreground">{tech}</span>
            </span>
          ) : null}
          {dur !== '—' ? (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{dur}</span>
          ) : null}
        </div>
        {primaryLabel?.trim() ? (
          <p className="mt-0.5 truncate text-xs font-medium text-foreground">{primaryLabel.trim()}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-foreground">{timeLine}</p>
        {notes?.trim() ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notes.trim()}</p>
        ) : null}
      </button>
    </li>
  );
}
