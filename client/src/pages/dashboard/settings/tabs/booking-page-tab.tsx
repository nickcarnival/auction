import { Tenant } from '@shared/tenant';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL, COOKIE_DOMAIN } from '@/utils/environment-util';
import { ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/pages/auth/auth-provider';

export function BookingPageTab() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { data, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });
      return await response.json();
    },
    enabled: !!tenantId,
  });

  const publicBookingHref = useMemo(() => {
    const slug =
      (typeof data?.subdomain === 'string' && data.subdomain.trim().toLowerCase()) ||
      data?.name?.toLowerCase().replace(/\s+/g, '') ||
      'booking';
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    if (COOKIE_DOMAIN === 'localhost') {
      return `${protocol}//${slug}.localhost${port}`;
    }
    return `${protocol}//${slug}.${COOKIE_DOMAIN}`;
  }, [data?.name, data?.subdomain]);

  if (isLoading || !data) {
    return <Skeleton className="h-[85dvh] w-full max-w-full" />;
  }

  return (
    <Card>
      <CardHeader className="gap-4 pb-4">
        <div className="max-w-prose space-y-3">
          <CardTitle className="text-xl">Your booking page</CardTitle>
          <p className="text-xs leading-snug text-muted-foreground">
            Edit name and contact in{' '}
            <Link
              to="/dashboard/settings/operations"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Operations
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button variant="solid" size="default" asChild>
            <a href={publicBookingHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              Open booking page
            </a>
          </Button>
          <a
            href={publicBookingHref}
            className="break-all font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:max-w-[min(100%,28rem)] sm:text-right"
            translate="no"
          >
            {publicBookingHref}
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t bg-muted/30 px-3 pb-3 pt-3 sm:px-4">
          <iframe
            key={publicBookingHref}
            title="Your customer booking page"
            src={publicBookingHref}
            className="pointer-events-none block h-[85dvh] w-full rounded-md border bg-background shadow-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
