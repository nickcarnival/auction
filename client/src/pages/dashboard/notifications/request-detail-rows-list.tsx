import { formatPhone } from '@shared/phone-utils';
import type { BookingRequest } from '@shared/booking';
import moment from 'moment';
import type { ReactNode } from 'react';
import { RequestDetailRow } from './request-detail-row';

interface RequestDetailRowsListProps {
  notification: BookingRequest;
}

type DetailRowConfig = {
  id: string;
  className?: string;
  content: (notification: BookingRequest) => ReactNode;
};

const DETAIL_ROWS: DetailRowConfig[] = [
  {
    id: 'phone',
    content: notification => (
      <>
        <span className="text-muted-foreground">Phone</span> {formatPhone(notification.phone)}
      </>
    ),
  },
  {
    id: 'preferred-dates',
    content: notification => (
      <>
        <span className="text-muted-foreground">Preferred</span>{' '}
        {moment(notification.start).format('MM/DD/YYYY')} drop ·{' '}
        {moment(notification.end).format('MM/DD/YYYY')} pick up
      </>
    ),
  },
];

function RequestDetailNotes({ notification }: { notification: BookingRequest }) {
  const text = notification.comments?.trim() || '—';
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <span className="text-muted-foreground">Customer Notes</span>
      <div className="mt-1.5 rounded-md border border-border bg-muted/30 px-3 py-2.5 whitespace-pre-wrap break-words">
        {text}
      </div>
    </div>
  );
}

export function RequestDetailRowsList({ notification }: RequestDetailRowsListProps) {
  return (
    <>
      {DETAIL_ROWS.map(({ id, className, content }) => (
        <RequestDetailRow key={id} className={className}>
          {content(notification)}
        </RequestDetailRow>
      ))}
      <RequestDetailNotes notification={notification} />
    </>
  );
}
