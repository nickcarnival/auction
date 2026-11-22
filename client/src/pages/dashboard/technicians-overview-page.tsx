import { useResourceContext } from '@/components/resources/resource-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TECHNICIAN_ID_SEARCH_PARAM,
  technicianDetailPath,
  WORKSPACE_MANAGER_NEW_PATH,
  workspaceManagerDetailPath,
} from '@/lib/technician-settings-url';
import { useAuth } from '@/pages/auth/auth-provider';
import { UserGrid } from '@/pages/dashboard/settings/user-grid';
import { canManageWorkspaceUsers } from '@shared/tenant-admin-role';
import { sortTechniciansForNav } from '@/pages/dashboard/technicians/technicians-nav-utils';
import { isSchedulableResource } from '@shared/resource';
import { Plus, Users } from 'lucide-react';
import { useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';

export default function TechniciansOverviewPage() {
  const { user } = useAuth();
  const canManageUsers = canManageWorkspaceUsers(user?.role);
  const { resources, setCurrentResource } = useResourceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const legacyTechnicianId = searchParams.get(TECHNICIAN_ID_SEARCH_PARAM) ?? undefined;

  const sorted = useMemo(() => sortTechniciansForNav(resources), [resources]);
  const activeList = useMemo(() => sorted.filter(r => isSchedulableResource(r)), [sorted]);
  const inactiveCount = sorted.length - activeList.length;

  if (legacyTechnicianId) {
    const rest = new URLSearchParams(searchParams);
    rest.delete(TECHNICIAN_ID_SEARCH_PARAM);
    const tail = rest.toString();
    return (
      <Navigate
        to={
          tail
            ? `${technicianDetailPath(legacyTechnicianId)}?${tail}`
            : technicianDetailPath(legacyTechnicianId)
        }
        replace
      />
    );
  }

  const handleAddTechnician = () => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete(TECHNICIAN_ID_SEARCH_PARAM);
        return next;
      },
      { replace: true }
    );
    setCurrentResource({
      name: '',
      email: '',
      color: 'Purple',
      tenantId: user?.tenantId,
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-6 pt-2 lg:pt-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Team</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Use the sidebar to open anyone directly, or scan the summary cards and manager list here.
          Technicians are the people on your calendar—each has a page for profile and schedule stats.
          Managers are dashboard logins; each has a page to invite, edit, or remove access.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader className="space-y-1 p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Total
            </CardDescription>
            <CardTitle className="flex items-baseline gap-2 text-2xl tabular-nums">
              {sorted.length}
              <Users className="size-5 text-muted-foreground opacity-70" aria-hidden />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            In the sidebar list
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="space-y-1 p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Active
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{activeList.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            On schedule &amp; assignable
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardHeader className="space-y-1 p-4 pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              Inactive
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{inactiveCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
            Hidden from calendar until reactivated
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleAddTechnician}>
          <Plus className="mr-2 size-4" aria-hidden />
          Add technician
        </Button>
        {canManageUsers ? (
          <Button variant="outline" type="button" asChild>
            <Link to={WORKSPACE_MANAGER_NEW_PATH} className="inline-flex items-center">
              <Plus className="mr-2 size-4" aria-hidden />
              Add manager
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="border-t border-border pt-6">
        <UserGrid
          tenantId={user?.tenantId}
          canManageUsers={canManageUsers}
          addUserButtonPlacement="none"
          managerRowHref={workspaceManagerDetailPath}
          createManagerHref={WORKSPACE_MANAGER_NEW_PATH}
          emptyAccountsMessage="No managers yet."
          pageIntro={{
            title: 'Managers',
            description: 'Dashboard logins for this tenant—not shown on the calendar as technicians.',
          }}
        />
      </div>
    </div>
  );
}
