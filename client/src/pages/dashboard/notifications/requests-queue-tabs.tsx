import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BookingRequestQueue } from '@shared/booking';
import { FollowUpsTabTrigger } from './follow-ups-tab-trigger';

type RequestsQueueTabsProps = {
  requestQueue: BookingRequestQueue;
  onQueueChange: (queue: BookingRequestQueue) => void;
};

export function RequestsQueueTabs({ requestQueue, onQueueChange }: RequestsQueueTabsProps) {
  return (
    <Tabs
      className="w-full max-w-full"
      value={requestQueue}
      onValueChange={v => onQueueChange(v as BookingRequestQueue)}
    >
      <TabsList className="inline-flex h-auto min-w-0 flex-wrap justify-center gap-1 overflow-visible">
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <FollowUpsTabTrigger />
        <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        <TabsTrigger value="rejected">Rejected</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
