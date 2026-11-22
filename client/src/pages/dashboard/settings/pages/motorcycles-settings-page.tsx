import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MotorbikeIcon } from '@/components/manage-appointment/motorbike-icon';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, Search } from 'lucide-react';
import type { Appointment } from '@shared/appointment';
import { buildVehicleCustomerIndex, type VehicleCustomerRow } from '@shared/vehicle-customer-index';
import { BASE_URL } from '@/utils/environment-util';
import { fetchJsonArrayOrThrow } from '@/lib/api-response';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function rowMatchesQuery(row: VehicleCustomerRow, q: string): boolean {
  if (!q) return true;
  if (row.vehicleDescription.toLowerCase().includes(q)) return true;
  return row.customers.some(c => c.displayName.toLowerCase().includes(q));
}

type SortKey = 'bike' | 'customers' | 'count';

/** Sort label for the Customers column: sorted names joined for stable locale compare */
function customersSortLabel(row: VehicleCustomerRow): string {
  return row.customers
    .map(c => c.displayName)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .join('\0');
}

function compareRowsPrimary(
  a: VehicleCustomerRow,
  b: VehicleCustomerRow,
  key: SortKey,
  dir: 'asc' | 'desc'
): number {
  const sign = dir === 'asc' ? 1 : -1;
  if (key === 'bike') {
    return (
      sign *
      a.vehicleDescription.localeCompare(b.vehicleDescription, undefined, { sensitivity: 'base' })
    );
  }
  if (key === 'count') {
    return sign * (a.customers.length - b.customers.length);
  }
  return (
    sign *
    customersSortLabel(a).localeCompare(customersSortLabel(b), undefined, { sensitivity: 'base' })
  );
}

export default function MotorcyclesSettingsPage() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('bike');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['tenant-appointments-vehicles-index'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/appointments/get-all`, {
        credentials: 'include',
      });
      return fetchJsonArrayOrThrow<Appointment>(response, 'Could not load appointments');
    },
  });

  const rows = useMemo(() => buildVehicleCustomerIndex(appointments ?? []), [appointments]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => rowMatchesQuery(row, q));
  }, [rows, search]);

  const sortedFilteredRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const primary = compareRowsPrimary(a, b, sortKey, sortDir);
      if (primary !== 0) return primary;
      return a.vehicleDescription.localeCompare(b.vehicleDescription, undefined, {
        sensitivity: 'base',
      });
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const onSortColumn = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const summary =
    search.trim().length > 0
      ? `${filteredRows.length} match${filteredRows.length === 1 ? '' : 'es'} · ${rows.length} total`
      : `${rows.length} bike${rows.length === 1 ? '' : 's'}`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild className="h-8 shrink-0 gap-1 px-2">
          <Link to="/dashboard/settings/operations">
            <ChevronLeft className="size-3.5" aria-hidden />
            Settings
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MotorbikeIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-lg font-semibold tracking-tight">Motorcycles</h1>
          </div>
        </div>
      </div>

      <div className="relative min-w-0 shrink-0">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search bike or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 pl-7 text-xs focus-visible:ring-inset"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:text-xs">
        {summary}
      </p>

      {isLoading ? (
        <div className="min-h-0 flex-1 space-y-1 overflow-hidden rounded-md border bg-card p-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="shrink-0">
          <CardHeader className="p-4 pb-4">
            <CardTitle className="text-sm">No motorcycles yet</CardTitle>
            <CardDescription className="text-xs">
              When appointments include a motorcycle (year and model), they show up here—same as
              each customer’s Vehicles list.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : sortedFilteredRows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No bikes or customers match “{search.trim()}”.{' '}
          <button
            type="button"
            className="text-primary underline underline-offset-2 hover:text-primary/90"
            onClick={() => setSearch('')}
          >
            Clear search
          </button>
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-card">
          <Table withScrollWrapper={false} aria-label="Motorcycles and customers">
            <TableHeader className="sticky top-0 z-10 bg-background/95 shadow-[0_1px_0_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-8 w-[38%] min-w-[9rem] px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <button
                    type="button"
                    className={cn(
                      'inline-flex max-w-full items-center gap-0.5 rounded-sm hover:text-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                    onClick={() => onSortColumn('bike')}
                    aria-sort={
                      sortKey === 'bike' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    <span className="truncate">Bike</span>
                    {sortKey === 'bike' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="size-3 shrink-0 opacity-90" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3 shrink-0 opacity-90" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 shrink-0 opacity-35" aria-hidden />
                    )}
                  </button>
                </TableHead>
                <TableHead className="h-8 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <button
                    type="button"
                    className={cn(
                      'inline-flex max-w-full items-center gap-0.5 rounded-sm hover:text-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                    onClick={() => onSortColumn('customers')}
                    aria-sort={
                      sortKey === 'customers'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <span className="truncate">Customers</span>
                    {sortKey === 'customers' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="size-3 shrink-0 opacity-90" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3 shrink-0 opacity-90" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 shrink-0 opacity-35" aria-hidden />
                    )}
                  </button>
                </TableHead>
                <TableHead className="h-8 w-10 px-1 py-1 text-center text-[11px] font-medium text-muted-foreground sm:w-12">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-sm hover:text-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                      )}
                      onClick={() => onSortColumn('count')}
                      aria-sort={
                        sortKey === 'count'
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      #
                      {sortKey === 'count' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="size-3 shrink-0 opacity-90" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3 shrink-0 opacity-90" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 shrink-0 opacity-35" aria-hidden />
                      )}
                    </button>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFilteredRows.map(row => (
                <TableRow key={row.vehicleDescription} className="border-border/80">
                  <TableCell className="max-w-0 px-2 py-1 align-top text-xs font-medium leading-snug [overflow-wrap:anywhere]">
                    {row.vehicleDescription}
                  </TableCell>
                  <TableCell className="px-2 py-1 align-top text-xs leading-snug">
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 [overflow-wrap:anywhere]">
                      {row.customers.map((c, idx) => (
                        <Fragment
                          key={`${row.vehicleDescription}-${c.customerId ?? 'noid'}-${idx}`}
                        >
                          {idx > 0 ? (
                            <span className="text-muted-foreground/80" aria-hidden>
                              {' · '}
                            </span>
                          ) : null}
                          {c.customerId ? (
                            <Link
                              to={`/dashboard/customers/${encodeURIComponent(c.customerId)}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {c.displayName}
                            </Link>
                          ) : (
                            <span className="text-foreground">
                              {c.displayName}
                              <span className="whitespace-nowrap text-muted-foreground">
                                {' '}
                                (no profile)
                              </span>
                            </span>
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-1 py-1 text-center align-top text-[11px] tabular-nums text-muted-foreground sm:px-2">
                    {row.customers.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
