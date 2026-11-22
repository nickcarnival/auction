import { useAuth } from '@/pages/auth/auth-provider';
import { useTenant } from '@/contexts/tenant-context';
import { pickPrimaryBusinessName } from '@shared/tenant';
import { normalizeTenantId } from '@/utils/tenant-id';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { NavUserMenuBody } from './nav-user-menu-body';
import { NavUserTrigger } from './nav-user-trigger';
import { navUserMenuContentClassName } from './nav-user-classes';

export const NavUser = () => {
  const { user, logout, isUserLoading } = useAuth();
  const { tenant, isLoading: tenantLoading, error: tenantError } = useTenant();

  const tenantDisplayName =
    pickPrimaryBusinessName(tenant) || pickPrimaryBusinessName(user?.tenant ?? null);

  const hasTenantId = Boolean(normalizeTenantId(user?.tenantId));
  const tenantLinePending =
    isUserLoading || (hasTenantId && tenantLoading && !tenantDisplayName && !tenantError);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NavUserTrigger
          userName={user?.name}
          tenantLinePending={tenantLinePending}
          tenantDisplayName={tenantDisplayName}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={1} className={navUserMenuContentClassName}>
        <NavUserMenuBody userId={user?._id} onLogout={logout} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
