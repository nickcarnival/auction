import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_URL } from '@/utils/environment-util';
import type { Tenant } from '@shared/tenant';
import { fetchJsonOrThrow } from '@/lib/api-response';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

type AdminTenantBillingAccessCardProps = {
  tenantId: string;
};

/**
 * Global-admin only: **Ignore billing** (`billingExempt`) — full bypass for access and billing UI.
 */
export function AdminTenantBillingAccessCard({ tenantId }: AdminTenantBillingAccessCardProps) {
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });
      return fetchJsonOrThrow<Tenant>(response, 'Failed to load tenant');
    },
    enabled: !!tenantId,
  });

  const [draftBillingExempt, setDraftBillingExempt] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    setDraftBillingExempt(tenant.billingExempt === true);
  }, [tenant]);

  const dirty = tenant && draftBillingExempt !== (tenant.billingExempt === true);

  const save = useMutation({
    mutationFn: async (payload: { billingExempt: boolean }) => {
      const response = await fetch(`${BASE_URL}/api/tenants/${tenantId}/billing-flags`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return fetchJsonOrThrow<{ tenant: Tenant }>(response, 'Failed to save billing access');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-by-id', tenantId] });
      await queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      await queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      toast.success('Billing access updated');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    },
  });

  if (!tenant || isLoading) {
    return <Skeleton className="h-56 w-full min-w-0 rounded-md border" />;
  }

  return (
    <Card className="min-w-0 shrink-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Billing access</CardTitle>
        <CardDescription className="text-sm">
          <strong>Ignore billing</strong> bypasses subscription checks and shows complimentary access in
          the customer billing screen. Use for support, comps, or mistakes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {tenant.billingExempt === true ? (
            <Badge variant="secondary">Billing exempt</Badge>
          ) : null}
        </div>
        <div className="space-y-3 rounded-md border border-border/80 p-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id={`exempt-${tenantId}`}
              checked={draftBillingExempt}
              onCheckedChange={v => setDraftBillingExempt(v === true)}
            />
            <div className="grid gap-1 leading-none">
              <Label htmlFor={`exempt-${tenantId}`} className="text-sm font-medium">
                Ignore billing
              </Label>
              <p className="text-xs text-muted-foreground">
                Full access without an active Stripe subscription.
              </p>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={!dirty || save.isPending}
          onClick={() => {
            save.mutate({ billingExempt: draftBillingExempt });
          }}
        >
          {save.isPending ? 'Saving…' : 'Save billing access'}
        </Button>
      </CardContent>
    </Card>
  );
}
