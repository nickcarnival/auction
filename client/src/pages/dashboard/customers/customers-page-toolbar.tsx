import { ManualRequestDialog } from '@/pages/dashboard/notifications/manual-request-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MotorbikeIcon } from '@/components/manage-appointment/motorbike-icon';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, GitMerge, Inbox, Search, Users } from 'lucide-react';
import { Link } from 'react-router';
import type { CustomerListSortOption } from './customer-list-sort';

type CustomersPageToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: CustomerListSortOption;
  onSortChange: (value: CustomerListSortOption) => void;
  mergeSelectedCount: number;
  onMergeSelected: () => void;
};

function sortSelectLabel(sortBy: CustomerListSortOption): string {
  switch (sortBy) {
    case 'appointments':
      return 'Most appointments';
    case 'requests':
      return 'Most requests';
    case 'recent':
      return 'Most recent';
    default:
      return 'Default order';
  }
}

/** Requests-style top bar: search grows on the left; filter select + links + new request on the right. */
export function CustomersPageToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  mergeSelectedCount,
  onMergeSelected,
}: CustomersPageToolbarProps) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 w-full flex-1 sm:max-w-none">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, email, or notes…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="h-9 pl-8 focus-visible:ring-inset"
          aria-label="Search customers"
        />
      </div>

      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:pl-2">
        {mergeSelectedCount >= 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={mergeSelectedCount < 2}
            title={
              mergeSelectedCount < 2
                ? 'Select at least two customers to merge'
                : 'Open merge tool for the selected profiles'
            }
            onClick={onMergeSelected}
          >
            <GitMerge className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Merge selected</span>
            <span className="sm:hidden">Merge</span>
            <span className="tabular-nums">({mergeSelectedCount})</span>
          </Button>
        ) : null}

        <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
          <Link to="/dashboard/settings/motorcycles">
            <MotorbikeIcon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Motorcycles</span>
          </Link>
        </Button>

        <Select
          value={sortBy}
          onValueChange={v => onSortChange(v as CustomerListSortOption)}
        >
          <SelectTrigger
            className={cn(
              'h-9 w-full min-w-[10.5rem] sm:w-48',
              sortBy !== 'default'
                ? 'border-primary bg-warning/15 text-warning-foreground hover:bg-warning/25'
                : ''
            )}
            aria-label="Sort or filter list order"
          >
            <SelectValue>{sortSelectLabel(sortBy)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="default">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Default order
              </span>
            </SelectItem>
            <SelectItem value="appointments">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Most appointments
              </span>
            </SelectItem>
            <SelectItem value="requests">
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Most requests
              </span>
            </SelectItem>
            <SelectItem value="recent">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                Most recent
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <ManualRequestDialog />
      </div>
    </div>
  );
}
