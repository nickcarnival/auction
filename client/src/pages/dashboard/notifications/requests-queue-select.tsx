import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/hooks/notification-context';
import type { BookingRequestQueue } from '@shared/booking';

const QUEUE_OPTIONS: { value: BookingRequestQueue; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'followups', label: 'Follow-ups' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
];

/** Queue filter as a right-aligned select (replaces tab chips). Follow-ups option can show a count pill. */
export function RequestsQueueSelect() {
  const { requestQueue, setRequestQueue, followUpsCountQuery } = useNotificationContext();
  const followUpCount = followUpsCountQuery.data ?? 0;

  return (
    <Select
      value={requestQueue}
      onValueChange={v => setRequestQueue(v as BookingRequestQueue)}
    >
      <SelectTrigger
        className={cn(
          'relative h-9 w-full min-w-[10.5rem] sm:w-44',
          requestQueue === 'followups' && followUpCount > 0 ? 'pr-8' : ''
        )}
        aria-label="Request queue"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SelectValue
            placeholder="Queue"
            aria-label={QUEUE_OPTIONS.find(o => o.value === requestQueue)?.label ?? 'Queue'}
          />
          {requestQueue === 'followups' && followUpCount > 0 && !followUpsCountQuery.isLoading ? (
            <Badge
              className={cn(
                'absolute right-8 top-1/2 z-[1] flex h-4 min-w-4 -translate-y-1/2 items-center justify-center rounded-full border-0 px-1 text-[10px] font-semibold leading-none tabular-nums',
                'bg-destructive text-destructive-foreground'
              )}
            >
              {followUpCount}
            </Badge>
          ) : null}
          {requestQueue === 'followups' && followUpsCountQuery.isLoading ? (
            <span className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-muted-foreground/40 animate-pulse" />
          ) : null}
        </div>
      </SelectTrigger>
      <SelectContent align="end">
        {QUEUE_OPTIONS.map(({ value, label }) =>
          value === 'followups' ? (
            <SelectItem key={value} value={value} textValue={label}>
              <span className="flex w-full items-center justify-between gap-2">
                <span>{label}</span>
                {!followUpsCountQuery.isLoading && followUpCount > 0 ? (
                  <Badge
                    className="h-4 min-w-4 shrink-0 rounded-full border-0 px-1 text-[10px] font-semibold tabular-nums bg-destructive text-destructive-foreground"
                  >
                    {followUpCount}
                  </Badge>
                ) : null}
              </span>
            </SelectItem>
          ) : (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
