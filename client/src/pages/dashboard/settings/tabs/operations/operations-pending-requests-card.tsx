import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OperationsFormType } from './operations-constants';
import { DEFAULT_PENDING_REQUEST_STALE_DAYS } from '@shared/tenant';

type OperationsPendingRequestsCardProps = {
  form: UseFormReturn<OperationsFormType>;
};

export function OperationsPendingRequestsCard({ form }: OperationsPendingRequestsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Requests inbox</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="pendingRequestStaleDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stale pending reminder (days)</FormLabel>
              <FormDescription>
                Pending requests with no confirmed appointment and older than this many days (from when
                they were created) get an automatic follow-up for today, a short staff note, and are
                marked unread—once per request. Applies when someone opens the pending or unread list.
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min={7}
                  max={365}
                  className="max-w-[8rem]"
                  {...field}
                  onChange={e => {
                    const n = e.target.valueAsNumber;
                    field.onChange(
                      Number.isFinite(n) ? n : DEFAULT_PENDING_REQUEST_STALE_DAYS
                    );
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
