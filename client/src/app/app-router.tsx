import { lazyRoute } from '@/lib/lazy-route';

const InternalRouter = lazyRoute(() => import('./internal-router'));
const SubdomainRouter = lazyRoute(() => import('./subdomain-router'));
const NotFoundPage = lazyRoute(() => import('@/pages/not-found-page'));
import { useSubdomainContext } from '@/pages/subdomain/subdomain-provider';
import { Skeleton } from '@/components/ui/skeleton';

export const AppRouter = () => {
  const { isValidSubdomain, isLoading, isInternal } = useSubdomainContext();

  if (isInternal) {
    return <InternalRouter />;
  }

  if (isLoading) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <Skeleton className="w-4xl h-[600px] bg-muted" />
      </div>
    );
  }

  if (isValidSubdomain) {
    return <SubdomainRouter />;
  }

  return <NotFoundPage />;
};
