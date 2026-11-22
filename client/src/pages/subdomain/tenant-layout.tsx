import { ReactNode } from 'react';
import { lazyRoute } from '@/lib/lazy-route';
import { cn } from '@/lib/utils';
import { useSubdomainContext } from './subdomain-provider';

const MaurersLayout = lazyRoute(() => import('./tenant-layouts/maurer-layout'));
const SolowLayout = lazyRoute(() => import('./tenant-layouts/solow-layout'));
const AdminLayout = lazyRoute(() => import('./tenant-layouts/admin-layout'));
const OneDownFourUpLayout = lazyRoute(() => import('./tenant-layouts/onedownfourup-layout'));
const ApplegurtzLayout = lazyRoute(() => import('./tenant-layouts/applegurtz-layout'));

export type TenantLayoutProps = {
  children: ReactNode;
  /**
   * Booking success and similar screens need extra vertical space; the default shell uses
   * `max-h` + `overflow-hidden` so the form doesn’t spill. When true, the inner panel scrolls instead.
   */
  scrollableContent?: boolean;
};

export const TenantLayout = ({ children, scrollableContent = false }: TenantLayoutProps) => {
  const { subdomainContext, subDomain } = useSubdomainContext();

  const layoutCode = (subdomainContext?.tenantCode ?? subDomain).toLowerCase();

  if (layoutCode === 'maurersmotors') {
    return <MaurersLayout children={children} />;
  }

  if (layoutCode === 'onedownfourup') {
    return <OneDownFourUpLayout children={children} />;
  }

  if (layoutCode === 'solowcycles') {
    return <SolowLayout children={children} />;
  }

  if (layoutCode === 'admintest') {
    return <AdminLayout children={children} />;
  }

  if (layoutCode === 'applegurtz') {
    return <ApplegurtzLayout children={children} />;
  }

  // This is the default layout
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center rounded-sm px-2 py-4 shadow-lg md:m-2 md:max-w-4xl md:rounded-md',
        scrollableContent
          ? 'max-h-none overflow-x-hidden overflow-y-auto md:max-h-[min(85vh,760px)]'
          : 'overflow-hidden md:max-h-[600px]'
      )}
    >
      {children}
    </div>
  );
};
