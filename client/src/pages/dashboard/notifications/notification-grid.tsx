import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CopyableText } from '@/components/ui/copyable-text';
import { formatPhone } from '@shared/phone-utils';
import moment from 'moment';
import { useNotificationContext } from '@/hooks/notification-context';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NotificationsSkeleton } from './notifications-skeleton';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { customerProfilePathFromBookingRequest } from '@/utils/customer-profile-path-from-booking-request';
import { getFollowUpUrgency } from '@/utils/booking-request-follow-up';
import { emptyMessageForQueue } from './notification-grid-messages';
import {
  COPY_FIELD_CELL,
  FollowUpTableCell,
  ReadStateChip,
  RequestStatusBadge,
  SortableHeader,
} from './notification-grid-parts';

export const NotificationGrid = () => {
  const {
    notifications,
    openNotificationDetails,
    closeNotificationDetails,
    requestQueue,
    isRequestsPending,
    markAsUnreadMutation,
  } = useNotificationContext();

  if (isRequestsPending && notifications === undefined) {
    return (
      <div className="min-h-0 flex-1 overflow-auto">
        <NotificationsSkeleton />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table withScrollWrapper={false}>
          <TableHeader className="[&_th]:h-auto [&_th]:py-2 [&_th]:px-2.5 [&_th]:align-bottom">
            <TableRow>
              <SortableHeader
                field="status"
                className="w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem] px-1 text-xs"
              >
                Read
              </SortableHeader>
              <SortableHeader
                field="confirmed"
                className="w-[6rem] min-w-[6rem] max-w-[6rem] text-xs"
              >
                Status
              </SortableHeader>
              <SortableHeader
                field="followUp"
                className="w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] px-1 text-xs"
              >
                Follow up
              </SortableHeader>
              <SortableHeader
                field="customer"
                className="min-w-[12rem] max-w-[18rem] whitespace-normal"
              >
                Customer
              </SortableHeader>
              <SortableHeader field="vehicle">Vehicle</SortableHeader>
              <SortableHeader field="notes" className="min-w-[12rem] max-w-xs">
                Customer Notes
              </SortableHeader>
              <SortableHeader field="dropoff">Preferred Dropoff</SortableHeader>
              <SortableHeader field="pickup">Preferred Pickup</SortableHeader>
              <SortableHeader field="created">Created</SortableHeader>
              <SortableHeader
                field="apps"
                className="w-[5.25rem] min-w-[5.25rem] max-w-[6rem] px-2 text-right text-xs tabular-nums"
              >
                Apps
              </SortableHeader>
            </TableRow>
          </TableHeader>

          <TableBody>
            {!notifications?.length && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 px-2.5 py-4 text-center text-muted-foreground"
                >
                  {emptyMessageForQueue(requestQueue)}
                </TableCell>
              </TableRow>
            )}
            {notifications?.map(notification => {
              const followUrg = getFollowUpUrgency(notification, requestQueue);
              return (
                <ContextMenu key={notification._id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      className={cn(
                        'cursor-pointer',
                        notification.readAt ? '' : 'bg-info',
                        followUrg === 'overdue' && 'border-l-4 border-amber-600',
                        followUrg === 'today' && 'border-l-4 border-orange-500'
                      )}
                      onClick={() => openNotificationDetails(notification)}
                    >
                      <TableCell className="w-[4.5rem] min-w-[4.5rem] max-w-[4.5rem] px-1 py-1.5 align-top">
                        <ReadStateChip n={notification} />
                      </TableCell>
                      <TableCell className="w-[6rem] min-w-[6rem] max-w-[6rem] px-1.5 py-1.5 align-top">
                        <RequestStatusBadge notification={notification} />
                      </TableCell>
                      <FollowUpTableCell n={notification} urgency={followUrg} />
                      <TableCell className="min-w-[12rem] max-w-[18rem] px-2.5 py-1.5 align-top">
                        <div className="flex min-w-0 flex-col gap-px text-sm leading-tight">
                          <div className="flex w-fit max-w-full min-w-0 items-start gap-0.5">
                            {notification.name?.trim() || notification.customerId?.trim() ? (
                              <>
                                <Link
                                  to={customerProfilePathFromBookingRequest(notification)}
                                  onClick={e => {
                                    e.stopPropagation();
                                    closeNotificationDetails();
                                  }}
                                  className="min-w-0 select-text break-words font-medium text-primary underline-offset-2 hover:underline"
                                >
                                  {notification.name?.trim() || '—'}
                                </Link>
                                <Link
                                  to={customerProfilePathFromBookingRequest(notification)}
                                  onClick={e => {
                                    e.stopPropagation();
                                    closeNotificationDetails();
                                  }}
                                  className="mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
                                  aria-label="View customer profile"
                                >
                                  <ExternalLink className="size-2.5" aria-hidden />
                                </Link>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          <CopyableText
                            copyText={notification.phone ?? ''}
                            copyLabel="Copy phone"
                            className="text-foreground/90 tabular-nums"
                          >
                            {formatPhone(notification.phone)}
                          </CopyableText>
                          <CopyableText
                            copyText={notification.email?.trim() ?? ''}
                            copyLabel="Copy email"
                            className="break-words text-foreground/90"
                          />
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(COPY_FIELD_CELL, 'break-words px-2.5 py-1.5 align-top')}
                        onClick={e => e.stopPropagation()}
                      >
                        {notification.vehicle}
                      </TableCell>
                      <TableCell className="min-w-[12rem] max-w-xs px-2.5 py-1.5 align-top">
                        {notification.comments ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2 cursor-default break-words text-left leading-tight">
                                {notification.comments}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-md text-left">
                              <p className="whitespace-pre-wrap text-sm">{notification.comments}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2.5 py-1.5 align-top tabular-nums">
                        {moment(notification.start).format('MM/DD/YYYY')}
                      </TableCell>
                      <TableCell className="px-2.5 py-1.5 align-top tabular-nums">
                        {moment(notification.end).format('MM/DD/YYYY')}
                      </TableCell>
                      <TableCell className="px-2.5 py-1.5 align-top tabular-nums">
                        {moment(notification.createdDate).format('MM/DD/YYYY')}
                      </TableCell>
                      <TableCell className="w-[5.25rem] min-w-[5.25rem] max-w-[6rem] px-2 py-1.5 text-right align-top text-xs tabular-nums text-muted-foreground">
                        {(notification.linkedAppointments?.length ?? 0) > 0
                          ? notification.linkedAppointments?.length
                          : '—'}
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuItem
                      disabled={!notification.readAt || markAsUnreadMutation.isPending}
                      onSelect={() => {
                        markAsUnreadMutation.mutate([notification._id], {
                          onSuccess: () => toast.success('Marked as unread'),
                          onError: err =>
                            toast.error(
                              err instanceof Error ? err.message : 'Could not mark as unread'
                            ),
                        });
                      }}
                    >
                      Mark as unread
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
