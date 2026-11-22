import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  findFirstGroupFocusIdForQuickFilter,
  mergeGroupMatchesQuickFilter,
  type MergeQuickFilter,
} from '@shared/customer-merge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Filter, GitMerge } from 'lucide-react';
import { useMergeSuggestionsQuery } from './customer-merge-suggestions';

function parseFilterParam(raw: string | null): MergeQuickFilter | null {
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

/**
 * Compact filters / merge shortcuts for the “all duplicate groups” directory.
 */
export function DuplicateGroupsQuickBar() {
  const { data: mergeSuggestions = [], isLoading, isFetched } = useMergeSuggestionsQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const active = parseFilterParam(searchParams.get('filter'));

  const setFilter = useCallback(
    (next: MergeQuickFilter | null) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (next == null) {
            p.delete('filter');
          } else {
            p.set('filter', next);
          }
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const stats = useMemo(() => {
    const totalGroups = mergeSuggestions.length;
    const phoneGroups = mergeSuggestions.filter(g =>
      mergeGroupMatchesQuickFilter(g, 'phone')
    ).length;
    const emailGroups = mergeSuggestions.filter(g =>
      mergeGroupMatchesQuickFilter(g, 'email')
    ).length;
    const nameGroups = mergeSuggestions.filter(g =>
      mergeGroupMatchesQuickFilter(g, 'name')
    ).length;
    const similarGroups = mergeSuggestions.filter(g =>
      mergeGroupMatchesQuickFilter(g, 'similar')
    ).length;
    const tripleGroups = mergeSuggestions.filter(g =>
      mergeGroupMatchesQuickFilter(g, 'triple')
    ).length;

    const uniqueInAnyGroup = new Set<string>();

    for (const g of mergeSuggestions) {
      for (const c of g.customers) {
        const id = c._id?.trim();
        if (id) uniqueInAnyGroup.add(id);
      }
    }

    return {
      totalGroups,
      phoneGroups,
      emailGroups,
      nameGroups,
      similarGroups,
      tripleGroups,
      uniqueInAnyGroup: uniqueInAnyGroup.size,
    };
  }, [mergeSuggestions]);

  const listFilterSummary = useMemo(() => {
    const z = stats;
    if (active == null) {
      return `All groups (${z.totalGroups})`;
    }
    const map: Record<MergeQuickFilter, string> = {
      phone: `Same phone (${z.phoneGroups} groups)`,
      email: `Same email (${z.emailGroups} groups)`,
      name: `Same name (${z.nameGroups} groups)`,
      similar: `Similar name (${z.similarGroups} groups)`,
      triple: `Phone, name & email (${z.tripleGroups} groups)`,
    };
    return map[active];
  }, [active, stats]);

  const openMerge = useCallback(
    (filter: MergeQuickFilter) => {
      const id = findFirstGroupFocusIdForQuickFilter(mergeSuggestions, filter);
      if (id) navigate(`/dashboard/customers/${id}/merge`);
    },
    [mergeSuggestions, navigate]
  );

  if (!isFetched || isLoading || mergeSuggestions.length === 0) {
    return null;
  }

  const s = stats;

  return (
    <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b border-border/50 pb-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 max-w-full gap-1.5 text-xs"
            aria-label="Filter duplicate groups"
          >
            <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{listFilterSummary}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onClick={() => setFilter(null)}>
            All groups ({s.totalGroups}) · {s.uniqueInAnyGroup} profiles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilter('triple')} disabled={s.tripleGroups === 0}>
            Phone, name & email ({s.tripleGroups}) · incl. no email or no phone
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilter('phone')} disabled={s.phoneGroups === 0}>
            Same phone ({s.phoneGroups} groups)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilter('email')} disabled={s.emailGroups === 0}>
            Same email ({s.emailGroups} groups)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilter('name')} disabled={s.nameGroups === 0}>
            Same name ({s.nameGroups} groups)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setFilter('similar')} disabled={s.similarGroups === 0}>
            Similar name ({s.similarGroups} groups)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            aria-label="Open merge tool for a group"
          >
            <GitMerge className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Open merge…
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            disabled={s.tripleGroups === 0}
            onClick={() => openMerge('triple')}
          >
            Next phone, name & email group
          </DropdownMenuItem>
          <DropdownMenuItem disabled={s.phoneGroups === 0} onClick={() => openMerge('phone')}>
            Next same-phone group
          </DropdownMenuItem>
          <DropdownMenuItem disabled={s.emailGroups === 0} onClick={() => openMerge('email')}>
            Next same-email group
          </DropdownMenuItem>
          <DropdownMenuItem disabled={s.nameGroups === 0} onClick={() => openMerge('name')}>
            Next same-name group
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={s.similarGroups === 0}
            onClick={() => openMerge('similar')}
          >
            Next similar-name group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
