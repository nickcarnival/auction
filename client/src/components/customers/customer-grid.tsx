import { normalizeCustomerNameWhileTyping } from '@shared/customer-name-utils';
import { duplicateNeighborCountByCustomerId } from '@shared/customer-merge';
import { useCustomerContext } from './customer-context';
import { CustomerDuplicatesBanner, useMergeSuggestionsQuery } from './customer-merge-suggestions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { MotorbikeIcon } from '@/components/manage-appointment/motorbike-icon';
import { Search, ArrowUpDown, Users, Calendar, Check, GitMerge, Inbox } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatPhone } from '@shared/phone-utils';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

/** Short date for customer list cards (e.g. Apr 3, 2026). */
function formatCustomerListDate(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CustomerCardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="space-y-0 p-3 pb-0">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="mt-2 h-3.5 w-full max-w-[11rem]" />
      </CardHeader>
      <CardContent className="space-y-1.5 p-3 pt-2">
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  );
}

type SortOption = 'default' | 'appointments' | 'requests' | 'recent';

export function CustomerGrid() {
  const { customers, isLoadingCustomers, searchCustomers } = useCustomerContext();
  const { data: mergeSuggestions = [] } = useMergeSuggestionsQuery();

  const duplicateNeighborCount = useMemo(
    () => duplicateNeighborCountByCustomerId(mergeSuggestions),
    [mergeSuggestions]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search')?.trim() ?? '');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [mergeSelectedIds, setMergeSelectedIds] = useState<Set<string>>(() => new Set());
  const navigate = useNavigate();

  const toggleMergeSelect = useCallback((id: string, checked: boolean) => {
    setMergeSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get('search')?.trim() ?? '';
    if (fromUrl) {
      setSearch(fromUrl);
    }
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearch(normalizeCustomerNameWhileTyping(value));
    if (searchParams.has('search')) {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete('search');
          return next;
        },
        { replace: true }
      );
    }
  };

  // Get current sort display info
  const getSortInfo = () => {
    switch (sortBy) {
      case 'appointments':
        return { label: 'Most Appointments', icon: Users };
      case 'requests':
        return { label: 'Most Requests', icon: Inbox };
      case 'recent':
        return { label: 'Most Recent', icon: Calendar };
      default:
        return { label: 'Default Order', icon: Search };
    }
  };

  // Sort customers based on selected option
  const sortedCustomers = useMemo(() => {
    if (!customers) return [];

    const customersCopy = [...customers];

    switch (sortBy) {
      case 'appointments':
        return customersCopy.sort((a, b) => b.appointmentCount - a.appointmentCount);
      case 'requests':
        return customersCopy.sort(
          (a, b) => (b.bookingRequestCount ?? 0) - (a.bookingRequestCount ?? 0)
        );
      case 'recent':
        // Sort by most recent appointment date, customers with no appointments go to end
        return customersCopy.sort((a, b) => {
          // Customers with appointments come first
          if (a.lastAppointmentDate && !b.lastAppointmentDate) return -1;
          if (!a.lastAppointmentDate && b.lastAppointmentDate) return 1;

          // Both have appointments - sort by most recent
          if (a.lastAppointmentDate && b.lastAppointmentDate) {
            return (
              new Date(b.lastAppointmentDate).getTime() - new Date(a.lastAppointmentDate).getTime()
            );
          }

          // Neither have appointments - sort by creation date
          const dateA = new Date(a.createdDate || '').getTime();
          const dateB = new Date(b.createdDate || '').getTime();
          return dateB - dateA;
        });
      default:
        return customersCopy;
    }
  }, [customers, sortBy]);

  const goMergeSelected = useCallback(() => {
    const selected = sortedCustomers.filter(c => c._id && mergeSelectedIds.has(c._id));
    if (selected.length < 2) return;
    const ids = selected.map(c => c._id as string);
    navigate(
      {
        pathname: '/dashboard/customers/merge-selected',
        search: `?ids=${encodeURIComponent(ids.join(','))}`,
      },
      { state: { customers: selected } }
    );
  }, [mergeSelectedIds, navigate, sortedCustomers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(search);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, searchCustomers]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-4">
        <CustomerDuplicatesBanner />
        <div className="flex min-w-0 items-center gap-2 pb-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-8 focus-visible:ring-inset"
            />
          </div>

          <Button variant="outline" size="default" className="shrink-0 gap-2" asChild>
            <Link to="/dashboard/settings/motorcycles">
              <MotorbikeIcon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Motorcycles</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`shrink-0 flex items-center gap-2 ${
                  sortBy !== 'default'
                    ? 'border-primary bg-warning/15 text-warning-foreground hover:bg-warning/25'
                    : 'hover:bg-muted'
                }`}
              >
                {(() => {
                  const { icon: Icon } = getSortInfo();
                  return <Icon className="h-4 w-4" />;
                })()}
                <span className="hidden sm:inline">{getSortInfo().label}</span>
                <span className="sm:hidden">Sort</span>
                <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSortBy('default')}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Default Order
                  </div>
                  {sortBy === 'default' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('appointments')}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Most Appointments
                  </div>
                  {sortBy === 'appointments' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('requests')}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    Most Requests
                  </div>
                  {sortBy === 'requests' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('recent')}>
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Most Recent
                  </div>
                  {sortBy === 'recent' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {mergeSelectedIds.size >= 1 ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="shrink-0 gap-1.5"
              disabled={mergeSelectedIds.size < 2}
              title={
                mergeSelectedIds.size < 2
                  ? 'Select at least two customers to merge'
                  : 'Open merge tool for the selected profiles'
              }
              onClick={goMergeSelected}
            >
              <GitMerge className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Merge selected</span>
              <span className="sm:hidden">Merge</span>
              <span className="tabular-nums">({mergeSelectedIds.size})</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-6">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {isLoadingCustomers && customers.length === 0 ? (
            <>
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
            </>
          ) : customers.length === 0 ? (
            <div className="col-span-full text-center text-xs text-muted-foreground">
              {search ? 'No customers found' : 'No customers yet'}
            </div>
          ) : (
            sortedCustomers.map(customer => {
              const dupCount = duplicateNeighborCount.get(customer._id ?? '') ?? 0;
              const lastVisit = formatCustomerListDate(customer.lastAppointmentDate);
              const customerSince = formatCustomerListDate(customer.createdDate);
              const reqCount = customer.bookingRequestCount ?? 0;
              return (
                <Card
                  key={customer._id}
                  className="min-w-0 cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/dashboard/customers/${customer._id}`)}
                >
                  <CardHeader className="space-y-0 p-3 pb-0">
                    <div className="flex min-w-0 items-start gap-2">
                      {customer._id ? (
                        <Checkbox
                          checked={mergeSelectedIds.has(customer._id)}
                          onClick={e => e.stopPropagation()}
                          onCheckedChange={v => toggleMergeSelect(customer._id as string, v === true)}
                          aria-label={`Select ${customer.name ?? 'customer'} for merge`}
                          className="mt-0.5 shrink-0 border-border data-[state=checked]:border-primary"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <CardTitle className="text-sm font-medium leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
                          {customer.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge
                            variant="outline"
                            className="h-5 shrink-0 px-1.5 py-0 text-[10px] font-normal leading-none tabular-nums"
                          >
                            {customer.appointmentCount} appt{customer.appointmentCount === 1 ? '' : 's'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="h-5 shrink-0 px-1.5 py-0 text-[10px] font-normal leading-none tabular-nums"
                            title="Booking requests linked to this customer"
                          >
                            <Inbox className="mr-0.5 inline size-2.5 align-[-0.125em]" aria-hidden />
                            {reqCount} req{reqCount === 1 ? '' : 's'}
                          </Badge>
                          {dupCount > 0 ? (
                            <Badge
                              variant="outline"
                              className="h-5 shrink-0 border-warning/40 bg-warning/10 px-1.5 py-0 text-[10px] font-normal leading-none text-warning-emphasis dark:border-warning/30 dark:bg-warning/15 dark:text-warning-foreground"
                              title="This profile appears in a merge suggestion with other customers"
                            >
                              <GitMerge className="mr-0.5 inline size-2.5 align-[-0.125em]" aria-hidden />
                              {dupCount} dup{dupCount === 1 ? '' : 's'}?
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-1.5 p-3 pt-2">
                    <div className="space-y-0.5 break-words text-xs leading-snug text-muted-foreground">
                      {customer.email ? (
                        <div className="break-all [overflow-wrap:anywhere]">{customer.email}</div>
                      ) : null}
                      {customer.phone ? (
                        <div className="tabular-nums text-foreground/90">{formatPhone(customer.phone)}</div>
                      ) : null}
                      {!customer.email?.trim() && !customer.phone?.trim() ? (
                        <div className="italic text-muted-foreground/90">No email or phone</div>
                      ) : null}
                    </div>
                    <div className="border-t border-border/60 pt-1.5 text-[11px] leading-snug text-muted-foreground">
                      {lastVisit ? (
                        <div>
                          Last visit <span className="text-foreground/80">{lastVisit}</span>
                        </div>
                      ) : (
                        <div className="italic">No visits yet</div>
                      )}
                      {customerSince ? (
                        <div>
                          Added <span className="text-foreground/80">{customerSince}</span>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
