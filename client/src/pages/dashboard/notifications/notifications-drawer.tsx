import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { Calendar, CircleOff, ExternalLink, EyeOff, Mail, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationContext } from '@/hooks/notification-context';
import { customerProfilePathFromBookingRequest } from '@/utils/customer-profile-path-from-booking-request';
import { NotificationDrawerDetailBody } from './notification-drawer-detail-body';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { TooltipProvider } from '@/components/ui/tooltip';

export const NotificationDrawer = () => {
  const navigate = useNavigate();

  const {
    closeNotificationDetails,
    rejectBookingMutation,
    markAsUnreadMutation,
    activeNotification,
    requestDetailId,
    isRequestDetailLoading,
  } = useNotificationContext();

  const isRejected = Boolean(activeNotification?.rejected);

  const markUnreadDisabled =
    isRequestDetailLoading ||
    !activeNotification?.readAt ||
    markAsUnreadMutation.isPending;

  const markUnreadTooltip = (() => {
    if (isRequestDetailLoading) return 'Loading request…';
    if (!activeNotification?.readAt) {
      return 'Only requests that have been opened in the dashboard can be marked unread.';
    }
    if (markAsUnreadMutation.isPending) return 'Updating…';
    return 'Mark as unread so this request stands out in the list again.';
  })();

  const rejectTooltip = rejectBookingMutation.isPending
    ? 'Rejecting…'
    : 'Decline this request. It moves to Rejected and any follow-up is cleared.';

  const addToCalendarTooltip =
    'Close this panel and open the schedule to place this request on the calendar.';

  const addToCalendar = useCallback(() => {
    const id = activeNotification?._id;
    if (!id) return;
    closeNotificationDetails();
    navigate(`/dashboard/schedule?placeRequest=${encodeURIComponent(id)}`);
  }, [activeNotification?._id, closeNotificationDetails, navigate]);

  return (
    <Sheet
      open={Boolean(requestDetailId)}
      onOpenChange={open => {
        if (!open) {
          closeNotificationDetails();
        }
      }}
    >
      <SheetContent className="flex h-full max-h-screen max-w-[100vw] flex-col gap-0 overflow-hidden py-6 pl-5 pr-3 sm:max-w-xl sm:pl-6 md:max-w-2xl md:pr-4">
        <SheetHeader className="shrink-0 space-y-1.5 pr-9 text-left">
          <SheetTitle>Request details</SheetTitle>
          <SheetDescription>
            {isRequestDetailLoading ? (
              'Loading…'
            ) : (
              <>
                {activeNotification?.name?.trim() ||
                activeNotification?.customerId?.trim() ? (
                  <span className="inline-flex flex-wrap items-center gap-0.5">
                    <span className="font-bold text-foreground">
                      {activeNotification.name?.trim() || '—'}
                    </span>
                    <Link
                      to={customerProfilePathFromBookingRequest(activeNotification)}
                      onClick={() => closeNotificationDetails()}
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/80 hover:text-foreground"
                      aria-label="View customer profile"
                    >
                      <ExternalLink className="size-3" aria-hidden />
                    </Link>
                  </span>
                ) : (
                  <span className="font-bold text-foreground">—</span>
                )}
                <span aria-hidden> · </span>
                {activeNotification?.vehicle ?? '—'}
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="space-y-4 text-sm">
            <NotificationDrawerDetailBody
              isLoading={isRequestDetailLoading}
              isRejected={isRejected}
              notification={activeNotification}
              linkedAppointments={activeNotification?.linkedAppointments ?? []}
            />
          </div>
        </div>

        <SheetFooter className="mt-4 shrink-0 flex-col gap-0 border-t border-border pt-4 sm:flex-col sm:space-x-0">
          <TooltipProvider delayDuration={400}>
            <div className="flex w-full flex-col gap-2">
              {/* Row 1: Email, Mark unread, Phone */}
              <div className="flex w-full min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 flex-1"
                  disabled={isRequestDetailLoading || !activeNotification?.email?.trim()}
                  onClick={() => {
                    const email = activeNotification?.email?.trim();
                    if (!email) return;
                    window.location.href = `mailto:${encodeURIComponent(email)}`;
                  }}
                >
                  <Mail className="mr-2 h-4 w-4 shrink-0" />
                  Email
                </Button>
                <TooltipButton
                  type="button"
                  tooltip={markUnreadTooltip}
                  variant="outline"
                  className="h-9 shrink-0 gap-1 px-2 sm:px-3"
                  disabled={markUnreadDisabled}
                  onClick={() => {
                    if (!activeNotification?._id) return;
                    markAsUnreadMutation.mutate([activeNotification._id], {
                      onSuccess: () => toast.success('Marked as unread'),
                      onError: err =>
                        toast.error(
                          err instanceof Error ? err.message : 'Could not mark as unread'
                        ),
                    });
                  }}
                >
                  <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden min-[380px]:inline">Mark unread</span>
                </TooltipButton>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  title="Call"
                  disabled={isRequestDetailLoading || !activeNotification?.phone?.replace(/\D/g, '')}
                  onClick={() => {
                    const digits = activeNotification?.phone?.replace(/\D/g, '') ?? '';
                    if (!digits) return;
                    window.location.href = `tel:${digits}`;
                  }}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span className="sr-only">Call</span>
                </Button>
              </div>

              {/* Row 2: Reject, Add to Calendar, Close */}
              <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2">
                {!isRejected && activeNotification && !isRequestDetailLoading ? (
                  <>
                    <TooltipButton
                      type="button"
                      tooltip={rejectTooltip}
                      variant="destructive"
                      className="min-h-9 shrink-0 sm:min-w-[5.5rem]"
                      disabled={rejectBookingMutation.isPending}
                      onClick={() =>
                        rejectBookingMutation.mutate(activeNotification._id, {
                          onSuccess: () => closeNotificationDetails(),
                        })
                      }
                    >
                      <CircleOff className="mr-2 h-4 w-4 shrink-0" />
                      Reject
                    </TooltipButton>
                    <TooltipButton
                      type="button"
                      tooltip={addToCalendarTooltip}
                      variant="solid"
                      tooltipDisabledWrapper={false}
                      className="min-h-9 min-w-0 flex-1 basis-[12rem]"
                      onClick={addToCalendar}
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0" />
                      Add to Calendar
                    </TooltipButton>
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-9 shrink-0 sm:min-w-[5.5rem]"
                      >
                        Close
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Button type="button" variant="outline" className="min-h-9 w-full">
                      Close
                    </Button>
                  </SheetClose>
                )}
              </div>
            </div>
          </TooltipProvider>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
