import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { buildManualMergeGroup } from '@shared/customer-merge';
import type { CustomerWithStats } from '@shared/customer';
import { Button } from '@/components/ui/button';
import { MergeSuggestionBlock } from '@/components/customers/customer-merge-suggestions';
import { useAuth } from '@/pages/auth/auth-provider';
import { BASE_URL } from '@/utils/environment-util';

const MAX_IDS = 24;

function parseIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const parts = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set(parts)].slice(0, MAX_IDS);
}

type LocationState = { customers?: CustomerWithStats[] } | null | undefined;

export default function CustomerManualMergePage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const urlIds = useMemo(() => parseIdsParam(searchParams.get('ids')), [searchParams]);
  const state = location.state as LocationState;
  const stateCustomers = state?.customers;

  const fromState = useMemo(() => {
    if (!stateCustomers || stateCustomers.length < 2) return null;
    if (urlIds.length === 0) {
      return stateCustomers;
    }
    const want = new Set(urlIds);
    const picked = stateCustomers.filter(c => c._id && want.has(c._id));
    if (picked.length !== urlIds.length || picked.length < 2) {
      return null;
    }
    return picked;
  }, [stateCustomers, urlIds]);

  const idsToFetch = useMemo(() => {
    if (fromState) return [] as string[];
    if (urlIds.length >= 2) return urlIds;
    return [] as string[];
  }, [fromState, urlIds]);

  const fetchedQueries = useQueries({
    queries: idsToFetch.map(id => ({
      queryKey: ['customer', id],
      queryFn: async (): Promise<CustomerWithStats | null> => {
        const response = await fetch(
          `${BASE_URL}/api/customers/get-by-id?customerId=${encodeURIComponent(id)}`,
          { credentials: 'include' }
        );
        if (!response.ok) return null;
        return response.json();
      },
      enabled: Boolean(tenantId) && idsToFetch.length >= 2,
    })),
  });

  const fromFetch = useMemo((): CustomerWithStats[] | null => {
    if (idsToFetch.length === 0) return null;
    if (fetchedQueries.some(q => q.isLoading)) return null;
    if (fetchedQueries.some(q => q.isError)) return null;
    const rows = fetchedQueries.map(q => q.data).filter((c): c is CustomerWithStats => c != null);
    if (rows.length !== idsToFetch.length) return null;
    return rows;
  }, [fetchedQueries, idsToFetch.length]);

  const resolvedCustomers = fromState ?? fromFetch;
  const group = useMemo(() => {
    if (!resolvedCustomers || resolvedCustomers.length < 2) return null;
    const built = buildManualMergeGroup(resolvedCustomers);
    return built.customers.length >= 2 ? built : null;
  }, [resolvedCustomers]);

  const isLoadingFetch = idsToFetch.length >= 2 && fetchedQueries.some(q => q.isLoading);

  return (
    <div className="mt-1 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden px-2 sm:px-3">
      <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2">
            <Link to="/dashboard/customers">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Customers
            </Link>
          </Button>
          <h1 className="min-w-0 text-xl font-semibold tracking-tight">Merge customers</h1>
        </div>
      </div>
      <div className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        {!tenantId ? null : isLoadingFetch ? (
          <p className="text-sm text-muted-foreground" aria-busy="true">
            Loading profiles…
          </p>
        ) : idsToFetch.length >= 2 && fetchedQueries.some(q => q.isError) ? (
          <p className="text-sm text-muted-foreground">
            Could not load one or more customers. Return to the list and try again, or check that
            every id is valid.
          </p>
        ) : idsToFetch.length >= 2 && !fromFetch ? (
          <p className="text-sm text-muted-foreground">
            Some selected profiles are missing or no longer available. Go back and pick customers
            again.
          </p>
        ) : !group ? (
          <p className="text-sm text-muted-foreground">
            Select at least two customers on the customer list, then use{' '}
            <span className="font-medium text-foreground">Merge selected</span>.
          </p>
        ) : (
          <div className="mx-auto w-full min-w-0 max-w-3xl pb-8 pt-1">
            <p className="mb-3 border-b border-border/60 pb-3 text-sm text-muted-foreground">
              Choose who to keep and edit the saved name, email, and phone before confirming.
            </p>
            <MergeSuggestionBlock group={group} mergeKind="manual" />
          </div>
        )}
      </div>
    </div>
  );
}
