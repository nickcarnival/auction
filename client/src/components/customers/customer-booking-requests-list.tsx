import { Badge } from '@/components/ui/badge';
import { REQUEST_DETAIL_SEARCH_PARAM } from '@/hooks/notification-context';
import { cn } from '@/lib/utils';
import type { BookingRequest, BookingRequestQueue } from '@shared/booking';
import moment from 'moment';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerBookingRequestsListProps {
  requests?: BookingRequest[];
  isLoading?: boolean;
}

function requestQueueLabel(req: BookingRequest): BookingRequestQueue {
  if (req.rejected) return 'rejected';
  if (req.isConfirmed) return 'confirmed';
  if (req.followUpAt != null && req.followUpAt !== '') return 'followups';
  return 'pending';
}

function requestDetailHref(req: BookingRequest): string {
  const id = encodeURIComponent(req._id);
  const queue = requestQueueLabel(req);
  return `/dashboard/requests?${REQUEST_DETAIL_SEARCH_PARAM}=${id}&queue=${queue}`;
}

function formatRequestWhen(req: BookingRequest): string {
  const raw = req.start ?? req.createdDate;
  if (raw == null || raw === '') {
    return '—';
  }
  const m = moment(raw);
  return m.isValid() ? m.format('MMM D, YYYY') : String(raw);
}

export function CustomerBookingRequestsList({
  requests,
  isLoading,
}: CustomerBookingRequestsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <p className="text-center text-muted-foreground">
        No booking requests with this profile yet
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {requests.map((req, index) => {
        const queue = requestQueueLabel(req);
        const queueBadgeLabel =
          queue === 'followups' ? 'Follow-ups' : queue;
        const serviceLine = req.service?.trim() || 'Request';
        const vehicleLine = [req.vehicle, req.model].filter(Boolean).join(' · ') || null;

        const badgeClass =
          queue === 'rejected'
            ? 'border-destructive/50 text-destructive'
            : queue === 'confirmed'
              ? 'border-emerald-600/50 text-emerald-700 dark:text-emerald-400'
              : queue === 'followups'
                ? 'border-amber-600/50 text-amber-800 dark:text-amber-300'
                : 'text-muted-foreground';

        return (
          <li key={req._id || `req-${index}`}>
            <Link
              to={requestDetailHref(req)}
              className={cn(
                'flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors',
                'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <span className="min-w-0 truncate font-medium">{serviceLine}</span>
                <Badge variant="outline" className={cn('shrink-0', badgeClass)}>
                  {queueBadgeLabel}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>{formatRequestWhen(req)}</span>
                {vehicleLine ? <span className="truncate">{vehicleLine}</span> : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
