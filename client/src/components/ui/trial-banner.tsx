import { AlertTriangle } from 'lucide-react';
import { useTenant } from '@/contexts/tenant-context';
import {
  isWithinAppTrialPeriod,
  tenantHasStripeEntitlement,
  type Tenant,
} from '@shared/tenant';

/** Shown when the tenant is in a trial state and still has dashboard access. */
export function shouldShowTrialBar(
  tenant: Tenant | null | undefined,
  hasBillingAccess: boolean
): boolean {
  if (!tenant || !hasBillingAccess) return false;
  if (tenantHasStripeEntitlement(tenant)) return false;
  if (tenant.subscriptionStatus === 'trialing') return true;
  if (isWithinAppTrialPeriod(tenant)) return true;
  return false;
}

export function isSubscriptionTrialing(tenant: Tenant | null | undefined): boolean {
  return tenant?.subscriptionStatus === 'trialing';
}

export const TrialBadge = () => {
  const { tenant, hasBillingAccess } = useTenant();

  if (!shouldShowTrialBar(tenant, hasBillingAccess)) {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium border border-warning/40 bg-warning/15 text-warning-foreground">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Trial
    </span>
  );
};
