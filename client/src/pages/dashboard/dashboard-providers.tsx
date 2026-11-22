import { ResourceProvider } from '@/components/resources/resource-context';
import { ScheduleProvider } from '@/components/schedule/appointment-context';
import { AppointmentFocusHighlight } from '@/components/schedule/appointment-focus-highlight';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationProvider } from '@/hooks/notification-context';
import { CustomerProvider } from '@/components/customers/customer-context';
import { TenantProvider, useTenant } from '@/contexts/tenant-context';
import { TourProvider } from '@/contexts/tour-context';
import { GenericFallback } from '@/components/generic-fallback';
import { useAuth } from '@/pages/auth/auth-provider';
import { normalizeTenantId } from '@/utils/tenant-id';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

type DashboardProvidersProps = { children: ReactNode };

function FullDashboardShell({ children }: { children: ReactNode }) {
  return (
    <TourProvider>
      <ResourceProvider>
        <ScheduleProvider>
          <AppointmentFocusHighlight />
          <NotificationProvider>
            <CustomerProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </CustomerProvider>
          </NotificationProvider>
        </ScheduleProvider>
      </ResourceProvider>
    </TourProvider>
  );
}

/** Schedule/customers APIs are blocked without billing; only billing settings + Stripe routes stay usable. */
function BillingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const {
    isLoading,
    error,
    hasBillingAccess,
    isAppTrialExpiredWithoutSubscription,
  } = useTenant();
  const location = useLocation();

  if (isGlobalTenantAdminRole(user?.role)) {
    return <FullDashboardShell>{children}</FullDashboardShell>;
  }

  const tenantId = normalizeTenantId(user?.tenantId);
  if (!tenantId) {
    return <FullDashboardShell>{children}</FullDashboardShell>;
  }

  if (isLoading) {
    return <GenericFallback />;
  }

  if (error) {
    return <FullDashboardShell>{children}</FullDashboardShell>;
  }

  const onBillingSettings = location.pathname.startsWith('/dashboard/settings/billing');
  const onTrialExpired = location.pathname === '/dashboard/trial-expired';
  const billingShellPaths = onBillingSettings || onTrialExpired;

  if (!hasBillingAccess && !billingShellPaths) {
    const to = isAppTrialExpiredWithoutSubscription
      ? '/dashboard/trial-expired'
      : '/dashboard/settings/billing';
    return <Navigate to={to} replace />;
  }

  if (!hasBillingAccess && billingShellPaths) {
    const inner = (
      <NotificationProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </NotificationProvider>
    );
    return (
      <TourProvider>
        {onBillingSettings ? (
          <ResourceProvider>{inner}</ResourceProvider>
        ) : (
          inner
        )}
      </TourProvider>
    );
  }

  return <FullDashboardShell>{children}</FullDashboardShell>;
}

export const DashboardProviders = ({ children }: DashboardProvidersProps) => {
  return (
    <TenantProvider>
      <BillingGate>{children}</BillingGate>
    </TenantProvider>
  );
};
