import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import type { MergeQuickFilter } from '@shared/customer-merge';
import { Button } from '@/components/ui/button';
import { DuplicateGroupsQuickBar } from '@/components/customers/duplicate-groups-quick-bar';
import { CustomerMergeSuggestionsPanel } from '@/components/customers/customer-merge-suggestions';

function parseMergeListFilter(raw: string | null): MergeQuickFilter | null {
  if (
    raw === 'phone' ||
    raw === 'email' ||
    raw === 'name' ||
    raw === 'similar' ||
    raw === 'triple'
  ) {
    return raw;
  }
  return null;
}

export default function CustomerDuplicatesPage() {
  const [searchParams] = useSearchParams();
  const groupListFilter = useMemo(
    () => parseMergeListFilter(searchParams.get('filter')),
    [searchParams]
  );

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
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">All duplicate groups</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Read-only directory of groups. Open a row to review, choose who to keep, and merge.
            </p>
          </div>
        </div>
      </div>
      <DuplicateGroupsQuickBar />
      <div className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <CustomerMergeSuggestionsPanel groupListFilter={groupListFilter} />
      </div>
    </div>
  );
}
