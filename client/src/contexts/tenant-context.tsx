import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tenant,
  isAppTrialExpiredWithoutSubscription as computeAppTrialExpiredWithoutSubscription,
  isWithinAppTrialPeriod,
  tenantHasBillingAccess,
} from '@shared/tenant';
import { DEFAULT_SHOP_HOURS, type ShopHours } from '@shared/shop-hours';
import { BASE_URL } from '@/utils/environment-util';
import { useAuth } from '@/pages/auth/auth-provider';
import { normalizeTenantId } from '@/utils/tenant-id';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

interface TenantContextType {
  tenant: Tenant | null;
  shopHours: ShopHours;
  isLoading: boolean;
  error: Error | null;
  /** Mirrors {@link tenantHasBillingAccess} — use for redirects and billing UI instead of re-deriving. */
  hasBillingAccess: boolean;
  /** `trialEndsAt` is set and still in the future. */
  isAppTrialActive: boolean;
  /** `trialEndsAt` passed and Stripe not entitled — use with billing shell / trial-expired route. */
  isAppTrialExpiredWithoutSubscription: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const tenantId = normalizeTenantId(user?.tenantId);

  const {
    data: tenant,
    isLoading,
    error,
  } = useQuery<Tenant>({
    queryKey: ['current-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) {
        throw new Error('No tenant ID available');
      }

      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to fetch tenant data'));
      }

      return await response.json();
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Always provide shop hours - either from tenant or default
  const shopHours = tenant?.shopHours || DEFAULT_SHOP_HOURS;

  const hasBillingAccess = useMemo(
    () => (tenant ? tenantHasBillingAccess(tenant) : false),
    [tenant]
  );
  const isAppTrialActive = useMemo(
    () => (tenant ? isWithinAppTrialPeriod(tenant) : false),
    [tenant]
  );
  const appTrialExpiredWithoutSubscription = useMemo(
    () => (tenant ? computeAppTrialExpiredWithoutSubscription(tenant) : false),
    [tenant]
  );

  const value: TenantContextType = {
    tenant: tenant || null,
    shopHours,
    isLoading,
    error: error as Error | null,
    hasBillingAccess,
    isAppTrialActive,
    isAppTrialExpiredWithoutSubscription: appTrialExpiredWithoutSubscription,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Convenience hook to just get shop hours
export const useShopHours = () => {
  const { shopHours } = useTenant();
  return shopHours;
};
