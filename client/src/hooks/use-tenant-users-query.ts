import { BASE_URL } from '@/utils/environment-util';
import { fetchJsonArrayOrThrow } from '@/lib/api-response';
import type { User } from '@shared/user';
import { useQuery } from '@tanstack/react-query';

/** @internal Keep in sync with list invalidation in user-modal code. */
export const TENANT_USERS_QUERY_KEY = 'user-by-tenant-id' as const;

type UseTenantUsersQueryOptions = {
  /** When false, the query does not run (e.g. billing shell where `/api/users/*` returns 403). */
  enabled?: boolean;
};

export function useTenantUsersQuery(
  tenantId: string | undefined,
  options?: UseTenantUsersQueryOptions
) {
  const enabled = Boolean(tenantId) && (options?.enabled ?? true);
  return useQuery<User[]>({
    queryKey: [TENANT_USERS_QUERY_KEY, tenantId],
    queryFn: async () => {
      const response = await fetch(
        `${BASE_URL}/api/users/get-by-tenant-id?tenantId=${tenantId}`,
        { credentials: 'include' }
      );
      return fetchJsonArrayOrThrow<User>(response, 'Failed to load team');
    },
    enabled,
  });
}
