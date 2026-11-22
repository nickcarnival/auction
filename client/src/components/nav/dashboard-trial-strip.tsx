import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { useTenant } from '@/contexts/tenant-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { shouldShowTrialBar, isSubscriptionTrialing } from '@/components/ui/trial-banner';
import { isWithinAppTrialPeriod } from '@shared/tenant';
import { format, parseISO } from 'date-fns';

export function DashboardTrialStrip() {
  const { tenant, hasBillingAccess } = useTenant();

  if (!shouldShowTrialBar(tenant, hasBillingAccess)) {
    return null;
  }

  const trialingCopy = isSubscriptionTrialing(tenant);
  const appTrialEndShort =
    tenant && isWithinAppTrialPeriod(tenant) && tenant.trialEndsAt?.trim()
      ? (() => {
          try {
            return format(parseISO(tenant.trialEndsAt), 'MMM d');
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <div
      className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-1.5 border-l border-warning-subtle-border pl-2 sm:max-w-[min(100%,20rem)]"
      data-tour="trial-status"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning-highlight" aria-hidden />
      <span className="hidden truncate text-xs font-semibold text-warning-foreground sm:inline">
        {trialingCopy ? 'Trial billing' : appTrialEndShort ? `Trial · ends ${appTrialEndShort}` : 'Free trial'}
      </span>
      <Button
        asChild
        variant="outline"
        size="sm"
        className={cn(
          'h-7 shrink-0 gap-1 border-2 border-warning-subtle-border bg-warning-subtle px-2 text-xs font-semibold text-warning-foreground',
          'shadow-sm hover:bg-warning-subtle/90 hover:border-warning-subtle-border'
        )}
      >
        <Link to="/dashboard/settings/billing">Upgrade</Link>
      </Button>
    </div>
  );
}
