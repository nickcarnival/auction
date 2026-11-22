import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { navUserTriggerButtonClassName } from './nav-user-classes';
import { cn } from '@/lib/utils';

export type NavUserTriggerProps = {
  userName?: string;
  tenantLinePending: boolean;
  tenantDisplayName?: string | null /** resolved business label */;
} & Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children'>;

/** Forwards ref and extra props from Radix `DropdownMenuTrigger` (`asChild`). */
export const NavUserTrigger = React.forwardRef<HTMLButtonElement, NavUserTriggerProps>(
  function NavUserTrigger(
    { userName, tenantLinePending, tenantDisplayName, className, ...props },
    ref
  ) {
    return (
      <Button
        ref={ref}
        type="button"
        variant="outline"
        size="sm"
        className={cn(navUserTriggerButtonClassName, className)}
        aria-label="Account menu"
        {...props}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-px text-left leading-none">
          {userName ? (
            <>
              <span className="block max-w-[6rem] truncate text-xs font-medium leading-none sm:max-w-[8.5rem] md:max-w-[9rem]">
                {userName}
              </span>
              {tenantLinePending ? (
                <Skeleton className="h-2 w-16 shrink-0 sm:w-24 md:w-28" />
              ) : tenantDisplayName ? (
                <span className="block max-w-[6rem] truncate text-[0.6875rem] leading-none text-muted-foreground sm:max-w-[8.5rem] md:max-w-[9rem]">
                  {tenantDisplayName}
                </span>
              ) : (
                <span className="block text-[0.6875rem] leading-none text-muted-foreground">Business</span>
              )}
            </>
          ) : (
            <>
              <Skeleton className="h-2.5 w-[6rem] shrink-0 sm:w-28" />
              <Skeleton className="h-2 w-16 shrink-0 sm:w-24" />
            </>
          )}
        </div>
        <ChevronDown className="size-3 shrink-0 self-center text-muted-foreground" aria-hidden />
      </Button>
    );
  }
);
NavUserTrigger.displayName = 'NavUserTrigger';
