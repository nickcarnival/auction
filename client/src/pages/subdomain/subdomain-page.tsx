import { BookingForm } from '@/components/booking/booking-form';
import { Suspense, useEffect } from 'react';
import { useSubdomainContext } from './subdomain-provider';
import { GenericFallback } from '@/components/generic-fallback';
import { TenantLayout } from './tenant-layout';
import { getTenantDisplayTitle } from '@shared/tenant';

export const Subdomain = () => {
  const { subdomainContext, subDomain } = useSubdomainContext();

  useEffect(() => {
    if (!subdomainContext) {
      document.title = 'loading...';
      return;
    }
    document.title = getTenantDisplayTitle(
      subdomainContext.tenant,
      subdomainContext.tenantCode,
      subDomain
    );
  }, [subdomainContext, subDomain]);

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden">
      <Suspense fallback={<GenericFallback />}>
        <TenantLayout>
          <BookingForm />
        </TenantLayout>
      </Suspense>
    </div>
  );
};
