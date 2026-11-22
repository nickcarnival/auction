import { useEffect, useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

type StripeCatalogPriceRow = {
  id: string;
  nickname: string | null;
  unitAmount: number | null;
  currency: string;
  recurringInterval: string | null;
};

type StripeCatalogResponse = {
  prices: StripeCatalogPriceRow[];
  /** Matches `STRIPE_SECRET_KEY` — use the same mode in Stripe Dashboard when comparing prices. */
  apiMode: 'live' | 'test';
};

/** Select value when the tenant has no saved `stripePriceId` (Checkout requires a chosen price). */
const STRIPE_CATALOG_USE_PLATFORM_DEFAULT = '__platform_default__';

function formatStripePriceLabel(row: StripeCatalogPriceRow): string {
  const bits = [row.id];
  if (row.nickname?.trim()) bits.push(row.nickname.trim());
  if (row.unitAmount != null && row.currency) {
    try {
      bits.push(
        new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: row.currency.toUpperCase(),
        }).format(row.unitAmount / 100)
      );
    } catch {
      bits.push(`${row.unitAmount / 100} ${row.currency}`);
    }
  }
  if (row.recurringInterval) bits.push(`/${row.recurringInterval}`);
  return bits.join(' · ');
}

type AdminTenantStripeCheckoutCardProps = {
  tenantId: string;
};

/**
 * Global-admin only: which Stripe Price id Checkout uses for this tenant.
 * Rendered beside “Tracked activity” on the tenant detail page.
 */
export function AdminTenantStripeCheckoutCard({ tenantId }: AdminTenantStripeCheckoutCardProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });
      return fetchJsonOrThrow<Tenant>(response, 'Failed to load tenant');
    },
    enabled: !!tenantId,
  });

  const { data: stripeCatalog, isLoading: catalogLoading } = useQuery<StripeCatalogResponse>({
    queryKey: ['stripe-catalog-prices'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/stripe/prices`, { credentials: 'include' });
      return fetchJsonOrThrow<StripeCatalogResponse>(response, 'Failed to load Stripe prices');
    },
    enabled: !!tenantId,
  });

  const [catalogDraft, setCatalogDraft] = useState<string>(STRIPE_CATALOG_USE_PLATFORM_DEFAULT);

  useEffect(() => {
    if (!data) return;
    setCatalogDraft(
      data.stripePriceId?.trim()?.length
        ? data.stripePriceId.trim()
        : STRIPE_CATALOG_USE_PLATFORM_DEFAULT
    );
  }, [data]);

  const saveStripeCatalog = useMutation({
    mutationFn: async (nextPriceId: string | null) => {
      const response = await fetch(`${BASE_URL}/api/tenants/${tenantId}/stripe-price`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripePriceId: nextPriceId === null ? null : nextPriceId }),
      });
      return fetchJsonOrThrow<{ stripePriceId: string | null }>(response, 'Failed to save Stripe price');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-by-id', tenantId] });
      await queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      await queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      toast.success('Checkout price saved for this tenant');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    },
  });

  const pendingResolved = useMemo((): string | null => {
    if (catalogDraft === STRIPE_CATALOG_USE_PLATFORM_DEFAULT) return null;
    return catalogDraft;
  }, [catalogDraft]);

  const stripeCatalogDirty = useMemo(() => {
    if (!data) return false;
    const saved = data.stripePriceId?.trim() ?? null;
    return pendingResolved !== saved;
  }, [data, pendingResolved]);

  if (!data || isLoading) {
    return <Skeleton className="h-48 w-full min-w-0 rounded-md border" />;
  }

  const orphanStripePriceId =
    data.stripePriceId?.trim() &&
    !(stripeCatalog?.prices ?? []).some(p => p.id === data.stripePriceId?.trim())
      ? data.stripePriceId.trim()
      : null;

  return (
    <Card className="min-w-0 shrink-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Stripe checkout price</CardTitle>
        <CardDescription className="space-y-1.5 text-sm">
          <p>
            Active prices from your Stripe account. If this tenant already has a saved{' '}
            <code className="text-xs">price_…</code> that isn&apos;t in the active list, it still
            appears in the dropdown.
          </p>
          {stripeCatalog ? (
            <p
              className={
                stripeCatalog.apiMode === 'test'
                  ? 'rounded-sm border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100'
                  : 'text-xs text-muted-foreground'
              }
            >
              API keys are{' '}
              <span className="font-semibold">
                {stripeCatalog.apiMode === 'live' ? 'Live' : 'Test'}
              </span>{' '}
              mode — open the same mode in Stripe (toggle top right). If the $ amount you expect only
              appears in the other mode, that’s the mismatch.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            &quot;No saved price&quot; means Checkout is blocked until you pick a price for this tenant.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {catalogLoading || !stripeCatalog ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Price</p>
              <Select
                value={
                  catalogDraft === STRIPE_CATALOG_USE_PLATFORM_DEFAULT
                    ? STRIPE_CATALOG_USE_PLATFORM_DEFAULT
                    : catalogDraft
                }
                onValueChange={value => {
                  setCatalogDraft(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STRIPE_CATALOG_USE_PLATFORM_DEFAULT}>
                    No saved price
                  </SelectItem>
                  {stripeCatalog.prices.map(row => (
                    <SelectItem key={row.id} value={row.id}>
                      {formatStripePriceLabel(row)}
                    </SelectItem>
                  ))}
                  {orphanStripePriceId ? (
                    <SelectItem value={orphanStripePriceId}>
                      {orphanStripePriceId} (current — not in active list)
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={saveStripeCatalog.isPending || !stripeCatalogDirty}
              onClick={() => {
                saveStripeCatalog.mutate(pendingResolved);
              }}
            >
              {saveStripeCatalog.isPending ? 'Saving…' : 'Save checkout price'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
