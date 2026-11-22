import type { Resource } from '@shared/resource';
import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';

const RESOURCES_QUERY_KEY = ['resources'] as const;

/**
 * Apply compact order patches to local state and React Query cache in one update, so the nav tree
 * reorders immediately without waiting for per-row mutations or a list refetch.
 */
export function applyResourceOrderPatches(
  patches: Array<{ _id: string; order: number }>,
  setResources: Dispatch<SetStateAction<Resource[]>>,
  queryClient: QueryClient
): void {
  if (patches.length === 0) {
    return;
  }
  const orderById = new Map(patches.map(p => [p._id, p.order]));
  setResources(prev => {
    const next = prev.map(r => {
      if (r._id == null || r._id === '') {
        return r;
      }
      const o = orderById.get(r._id);
      return o !== undefined ? { ...r, order: o } : r;
    });
    queryClient.setQueryData<Resource[]>(RESOURCES_QUERY_KEY, next);
    return next;
  });
}
