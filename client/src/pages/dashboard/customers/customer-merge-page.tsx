import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerMergeSuggestionsPanel } from '@/components/customers/customer-merge-suggestions';

/**
 * Full merge UI for a single customer: only suggestion groups that include this id (same workflow
 * as /dashboard/customers/duplicates, scoped).
 */
export default function CustomerMergePage() {
  const { customerId } = useParams<{ customerId: string }>();
  const id = customerId?.trim() ?? '';

  if (!id) {
    return (
      <div className="mt-1 p-4 text-sm text-muted-foreground">
        Missing customer id.{' '}
        <Link to="/dashboard/customers" className="text-primary underline underline-offset-4">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-1 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden px-2 sm:px-3">
      <div className="mb-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="shrink-0 -ml-2">
            <Link to={`/dashboard/customers/${id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Customer
            </Link>
          </Button>
          <h1 className="min-w-0 text-xl font-semibold tracking-tight">Merge duplicate profiles</h1>
        </div>
        <Button variant="outline" size="sm" asChild className="w-full shrink-0 sm:w-auto">
          <Link to="/dashboard/customers/duplicates">All duplicate groups</Link>
        </Button>
      </div>
      <div className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <CustomerMergeSuggestionsPanel scopeToCustomerId={id} />
      </div>
    </div>
  );
}
