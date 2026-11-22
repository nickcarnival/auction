import { Badge } from '@/components/ui/badge';
import { TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/hooks/notification-context';

/** Follow-ups tab chip with a count pill (same positioning idea as `RequestsNavItem`). */
export function FollowUpsTabTrigger() {
  const { followUpsCountQuery } = useNotificationContext();
  const count = followUpsCountQuery.data ?? 0;

  return (
    <TabsTrigger value="followups" className="pr-2.5">
      <span className="pr-0.5">Follow-ups</span>
      <Badge
        className={cn(
          'absolute right-0 top-1/4 z-[2] flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 px-1 text-[10px] font-semibold leading-none tabular-nums shadow-sm',
          followUpsCountQuery.isLoading
            ? 'bg-muted-foreground animate-pulse text-background'
            : 'bg-destructive text-destructive-foreground',
          !followUpsCountQuery.isLoading && count > 0 ? undefined : 'hidden'
        )}
      >
        {count}
      </Badge>
    </TabsTrigger>
  );
}
