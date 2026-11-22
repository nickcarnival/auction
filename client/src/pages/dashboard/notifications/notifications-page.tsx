import { ManualRequestDialog } from './manual-request-dialog';
import { NotificationDrawer } from './notifications-drawer';
import { NotificationGrid } from './notification-grid';
import { RequestsQueueTabs } from './requests-queue-tabs';
import { AppointmentModal } from '@/components/manage-appointment/appointment-modal';
import { useNotificationContext } from '@/hooks/notification-context';

export default function NotificationsPage() {
  const { requestQueue, setRequestQueue } = useNotificationContext();

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-2 overflow-hidden pb-4">
      <AppointmentModal />
      <NotificationDrawer />

      <div className="flex min-w-0 shrink-0 flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 justify-center overflow-x-auto overflow-y-visible py-0.5">
          <RequestsQueueTabs requestQueue={requestQueue} onQueueChange={setRequestQueue} />
        </div>
        <div className="flex shrink-0 justify-end sm:pl-2">
          <ManualRequestDialog />
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border">
        <NotificationGrid />
      </div>
    </div>
  );
}
