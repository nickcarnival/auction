import type { ReactNode } from 'react';
import { TableCell, TableHead } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/hooks/notification-context';
import type { BookingRequest } from '@shared/booking';
import { ChevronsUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import moment from 'moment';
import {
  formatFollowUpTableDate,
  type FollowUpUrgency,
} from '@/utils/booking-request-follow-up';

export interface SortableHeaderProps {
  children: ReactNode;
  field: string;
  className?: string;
}

export function SortableHeader({ children, field, className }: SortableHeaderProps) {
  const { sortConfig, handleSort } = useNotificationContext();

  const getSortIcon = () => {
    if (sortConfig.field !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <TableHead
      className={cn(
        'sticky top-0 z-20 cursor-pointer select-none bg-background shadow-[0_1px_0_hsl(var(--border))]',
        'hover:bg-muted',
        className
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
        <span className="min-w-0 truncate">{children}</span>
        <span className="shrink-0">{getSortIcon()}</span>
      </div>
    </TableHead>
  );
}

export function RequestStatusBadge({ notification }: { notification: BookingRequest }) {
  const compact = 'px-1.5 py-px text-[11px] font-normal leading-tight';
  if (notification.rejected) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-destructive/60 bg-destructive/10 text-destructive',
          compact
        )}
      >
        Rejected
      </Badge>
    );
  }
  if (notification.isConfirmed) {
    return <Badge className={cn('bg-success text-primary-foreground', compact)}>Confirmed</Badge>;
  }
  return <Badge className={cn('bg-neutral text-primary-foreground', compact)}>Pending</Badge>;
}

function readStateTooltip(n: BookingRequest): string {
  if (n.readAt) {
    return `Opened ${moment(n.readAt).format('MMM D, YYYY h:mm A')}`;
  }
  return 'Not opened in the dashboard yet';
}

export function ReadStateChip({ n }: { n: BookingRequest }) {
  const isRead = Boolean(n.readAt);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">
          {isRead ? (
            <Badge variant="outline" className="px-1.5 py-px text-[11px] font-normal leading-tight">
              Read
            </Badge>
          ) : (
            <Badge variant="destructive" className="px-1.5 py-px text-[11px] font-normal leading-tight">
              Unread
            </Badge>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {readStateTooltip(n)}
      </TooltipContent>
    </Tooltip>
  );
}

export function FollowUpTableCell({
  n,
  urgency,
}: {
  n: BookingRequest;
  urgency: FollowUpUrgency;
}) {
  if (n.followUpAt == null || n.followUpAt === '') {
    return (
      <TableCell
        className={cn(
          '[vertical-align:top] w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] px-1 py-1.5 text-xs tabular-nums',
          'text-muted-foreground'
        )}
      >
        —
      </TableCell>
    );
  }
  const date = formatFollowUpTableDate(n);
  return (
    <TableCell
      className={cn(
        '[vertical-align:top] w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] px-1 py-1.5 text-xs',
        urgency === 'overdue' && 'font-medium text-amber-900 dark:text-amber-200',
        urgency === 'today' && 'font-medium text-orange-800 dark:text-orange-200',
        urgency === 'none' && 'text-muted-foreground tabular-nums'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-px leading-tight">
            <span className="tabular-nums">{date}</span>
            {urgency === 'overdue' && (
              <Badge
                variant="outline"
                className="w-fit border-amber-700/40 bg-amber-500/15 text-[10px] font-normal text-amber-900 dark:text-amber-100"
              >
                Overdue
              </Badge>
            )}
            {urgency === 'today' && (
              <Badge className="w-fit bg-orange-600 text-[10px] font-normal text-primary-foreground hover:bg-orange-600/90">
                Due today
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {urgency === 'overdue' &&
            'This follow-up date has passed. Consider reaching out or picking a new date.'}
          {urgency === 'today' && 'You asked to check back with this contact today.'}
          {urgency === 'none' && 'Follow-up is set for a future date.'}
        </TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

/** Isolated cells: row click opens the drawer; these stay copy-friendly (no drawer on click). */
export const COPY_FIELD_CELL =
  'select-text cursor-text [vertical-align:top] *:select-text *:cursor-text';
