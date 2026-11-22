import type { BookingRequest, BookingRequestLinkedAppointment } from '@shared/booking';
import { LinkedCalendarAppointmentsList } from './linked-calendar-appointments-list';
import { RequestDetailRowsList } from './request-detail-rows-list';
import { RequestFollowUpSection } from './request-follow-up-section';

interface NotificationDrawerDetailBodyProps {
  isLoading: boolean;
  isRejected: boolean;
  notification: BookingRequest | null;
  linkedAppointments: BookingRequestLinkedAppointment[];
}

export function NotificationDrawerDetailBody({
  isLoading,
  isRejected,
  notification,
  linkedAppointments,
}: NotificationDrawerDetailBodyProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading request…</p>;
  }

  if (!notification) {
    return null;
  }

  return (
    <>
      {isRejected ? (
        <p className="rounded-sm border border-border bg-muted/50 px-3 py-2 text-sm leading-snug text-muted-foreground">
          Rejected queue — contact details below if needed.
        </p>
      ) : null}
      <RequestDetailRowsList notification={notification} />
      <RequestFollowUpSection notification={notification} />
      <LinkedCalendarAppointmentsList appointments={linkedAppointments} />
    </>
  );
}
