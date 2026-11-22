import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BASE_URL } from '@/utils/environment-util';
import type { UserEventTenantSummary } from '@shared/schemas/user-event-schema';
import { Tenant } from '@shared/tenant';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { UserGrid } from '../settings/user-grid';
import { TenantInfo } from '../settings/tenant-info';
import { AdminTenantStripeCheckoutCard } from './admin-tenant-stripe-checkout-card';
import { AdminTenantBillingAccessCard } from './admin-tenant-billing-access-card';
import { AdminTenantWorkspaceRolesCard } from './admin-tenant-workspace-roles-card';
import { useAuth } from '@/pages/auth/auth-provider';
import { useMemo } from 'react';
import { APP_ROLE, hasMinimumAppRole } from '@shared/app-rbac';
import { fetchJsonOrThrow } from '@/lib/api-response';

const TENANT_DETAIL_TABS = ['tenant', 'users', 'billing'] as const;
type TenantDetailTab = (typeof TENANT_DETAIL_TABS)[number];

function isTenantDetailTab(value: string | null): value is TenantDetailTab {
  return value != null && TENANT_DETAIL_TABS.includes(value as TenantDetailTab);
}

const TenantDetailsPage = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: TenantDetailTab = useMemo(() => {
    const raw = searchParams.get('tab');
    return isTenantDetailTab(raw) ? raw : 'tenant';
  }, [searchParams]);

  const setTab = (next: TenantDetailTab) => {
    setSearchParams(
      prev => {
        const p = new URLSearchParams(prev);
        if (next === 'tenant') {
          p.delete('tab');
        } else {
          p.set('tab', next);
        }
        return p;
      },
      { replace: true }
    );
  };

  const { data, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', id],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${id}`, {
        credentials: 'include',
      });
      return fetchJsonOrThrow<Tenant>(response, 'Failed to load tenant');
    },
    enabled: !!id,
  });

  const { user } = useAuth();

  const isAdmin = useMemo(() => hasMinimumAppRole(user?.role, APP_ROLE.ADMIN), [user?.role]);

  const { data: eventSummary, isLoading: summaryLoading } = useQuery<UserEventTenantSummary>({
    queryKey: ['tenant-event-summary', id],
    queryFn: async () => {
      const response = await fetch(
        `${BASE_URL}/api/analytics/tenant-summary?tenantId=${encodeURIComponent(id!)}`,
        { credentials: 'include' }
      );
      return fetchJsonOrThrow<UserEventTenantSummary>(
        response,
        'Failed to load activity summary'
      );
    },
    enabled: !!id && isAdmin,
  });

  const sortedActions = useMemo(() => {
    const rows = Object.entries(eventSummary?.byAction ?? {});
    rows.sort((a, b) => b[1] - a[1]);
    return rows;
  }, [eventSummary?.byAction]);

  if (!id) {
    return <Navigate to="/dashboard/tenant" replace />;
  }

  if (!data || isLoading || !user?._id) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard/schedule" replace />;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto p-1">
      <Tabs
        value={activeTab}
        onValueChange={v => setTab(v as TenantDetailTab)}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <TabsList className="h-auto w-full shrink-0 flex-wrap justify-start gap-2 border-b border-border/60 pb-2">
          <TabsTrigger value="tenant">Tenant</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="mt-3 min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
            <div className="w-full min-w-0 shrink-0 lg:max-w-md">
              <TenantInfo tenantId={id} />
            </div>
            <Card className="min-w-0 flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tracked activity</CardTitle>
                <CardDescription>
                  Raw counts from server-side <code className="text-xs">user_events</code> (not
                  real-time to the second).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <Skeleton className="h-16 w-full max-w-md" />
                ) : (
                  <div className="space-y-3 text-sm">
                    <p>
                      <span className="text-muted-foreground">Total events</span>{' '}
                      <span className="font-mono tabular-nums font-semibold">
                        {eventSummary?.total ?? 0}
                      </span>
                    </p>
                    {sortedActions.length > 0 ? (
                      <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs">
                        {sortedActions.map(([action, count]) => (
                          <li
                            key={action}
                            className="flex justify-between gap-4 border-b border-border/50 py-0.5"
                          >
                            <span className="min-w-0 truncate">{action}</span>
                            <span className="shrink-0 tabular-nums">{count}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No events recorded for this tenant yet.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-3 flex min-h-0 flex-1 flex-col gap-4">
          <AdminTenantWorkspaceRolesCard tenantId={id} />
          <UserGrid tenantId={id} canManageUsers />
        </TabsContent>

        <TabsContent value="billing" className="mt-3 min-h-0 flex-1">
          <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
            <AdminTenantBillingAccessCard tenantId={id} />
            <AdminTenantStripeCheckoutCard tenantId={id} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantDetailsPage;
