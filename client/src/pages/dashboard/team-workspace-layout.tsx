import { AddTechnician } from '@/components/resources/technician-modal';
import { useResourceContext } from '@/components/resources/resource-context';
import { Button } from '@/components/ui/button';
import { useTenantUsersQuery } from '@/hooks/use-tenant-users-query';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/pages/auth/auth-provider';
import { TeamWorkspaceSidebar } from '@/pages/dashboard/team-workspace-sidebar';
import {
  buildManagerNavLists,
  buildTechnicianNavLists,
} from '@/pages/dashboard/team-workspace-nav-utils';
import { useTenant } from '@/contexts/tenant-context';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { canManageWorkspaceUsers } from '@shared/tenant-admin-role';
import { useMemo, useState } from 'react';
import { Outlet, useParams } from 'react-router';
import { UserCog } from 'lucide-react';

/**
 * Shared shell for team (technicians, managers) and business settings. Left nav matches the
 * technicians tree pattern and adds Settings links (operations, booking page, billing, data, notifications).
 */
export default function TeamWorkspaceLayout() {
  const { technicianId, managerId } = useParams<{
    technicianId?: string;
    managerId?: string;
  }>();
  const { user } = useAuth();
  const { tenant, isLoading: tenantLoading, hasBillingAccess } = useTenant();
  const { resources } = useResourceContext();
  const showTeamNav =
    isGlobalTenantAdminRole(user?.role) ||
    tenantLoading ||
    (tenant ? hasBillingAccess : true);

  const managersQueryEnabled =
    Boolean(user?.tenantId) &&
    (isGlobalTenantAdminRole(user?.role) || (tenant != null && hasBillingAccess));

  const managerDetailLinks = canManageWorkspaceUsers(user?.role);

  const { data: managersData } = useTenantUsersQuery(user?.tenantId, {
    enabled: managersQueryEnabled,
  });
  const managerTreeId = technicianId ? '' : (managerId ?? '');
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  const technicianNav = useMemo(() => buildTechnicianNavLists(resources), [resources]);
  const managerNav = useMemo(
    () => buildManagerNavLists(managersData ?? []),
    [managersData]
  );
  const treeCurrentId = technicianId ?? '';

  return (
    <div className="mt-1 flex min-h-0 min-w-0 w-full flex-1 flex-col lg:flex-row">
      <aside className="relative hidden min-h-0 w-56 shrink-0 border-r border-border lg:flex lg:flex-col xl:w-60">
        <TeamWorkspaceSidebar
          activeTechnicians={technicianNav.active}
          inactiveTechnicians={technicianNav.inactive}
          currentId={treeCurrentId}
          {...managerNav}
          managerTreeCurrentId={managerTreeId}
          showTeamNav={showTeamNav}
          managerDetailLinks={managerDetailLinks}
          className="min-h-0 flex-1"
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
            <Sheet open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                  <UserCog className="size-3.5 shrink-0" aria-hidden />
                  Team & settings
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-full max-w-[min(20rem,100vw)] flex-col p-0 [&>button]:z-10"
              >
                <TeamWorkspaceSidebar
                  activeTechnicians={technicianNav.active}
                  inactiveTechnicians={technicianNav.inactive}
                  currentId={treeCurrentId}
                  {...managerNav}
                  managerTreeCurrentId={managerTreeId}
                  showTeamNav={showTeamNav}
                  managerDetailLinks={managerDetailLinks}
                  className="min-h-0 flex-1"
                  onItemNavigate={() => setMobileTreeOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
          <Outlet />
        </div>
      </div>

      {showTeamNav ? <AddTechnician /> : null}
    </div>
  );
}
