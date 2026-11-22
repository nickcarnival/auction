import { Bell } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/hooks/notification-context';

type RequestsNavItemProps = {
  title: string;
};

/** Requests nav chip: bell + label + unread count pinned to the chip’s top-right (NavLink is `relative`). */
export function RequestsNavItem({ title }: RequestsNavItemProps) {
  const { unreadQuery } = useNotificationContext();

  return (
    <>
      <Bell
        className={cn(
          'size-5 shrink-0 transition-transform',
          !unreadQuery.isLoading && unreadQuery.data?.length
            ? 'animate-[vibrate_0.3s_ease-in-out_infinite]'
            : ''
        )}
        aria-hidden
      />
      <span className="hidden md:inline-block">{title}</span>
      {/* Badge is a `div`; keep it out of `span` ancestors. Position vs. `relative` NavLink. */}
      <Badge
        className={cn(
          'absolute right-0 top-1/4 z-[1] flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 px-1 text-[10px] font-semibold leading-none tabular-nums shadow-sm',
          unreadQuery.isLoading
            ? 'bg-muted-foreground animate-pulse text-background'
            : 'bg-destructive text-destructive-foreground',
          !unreadQuery.isLoading && unreadQuery.data?.length ? undefined : 'hidden'
        )}
      >
        {unreadQuery.data?.length}
      </Badge>
    </>
  );
}

const style = document.createElement('style');
style.textContent = `
  @keyframes vibrate {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(5deg); }
    50% { transform: rotate(0deg); }
    75% { transform: rotate(-5deg); }
    100% { transform: rotate(0deg); }
  }
`;
document.head.append(style);
