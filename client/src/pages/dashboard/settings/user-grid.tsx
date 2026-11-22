import { useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { User } from '@shared/user';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { UserModal } from '@/components/user/user-modal';
import { cn } from '@/lib/utils';
import { useTenantUsersQuery } from '@/hooks/use-tenant-users-query';
import { useNavigate } from 'react-router';

type UserGridProps = {
  /** Workspace whose users are listed (required). */
  tenantId: string | undefined;
  /**
   * Invite / edit / delete user accounts (tenant admin or platform admin).
   * When false, the table is read-only.
   * @default false
   */
  canManageUsers?: boolean;
  /** When set, title/description and Add user share one row (settings team page). */
  pageIntro?: { title: string; description: string };
  /**
   * When `none`, the Add user button is omitted (caller can place it elsewhere, e.g. next to Add technician).
   * @default 'header'
   */
  addUserButtonPlacement?: 'header' | 'none';
  /** Copy for the empty table state. */
  emptyAccountsMessage?: string;
  /**
   * When set with {@link createManagerHref}, rows navigate to manager detail pages instead of a dialog.
   */
  managerRowHref?: (userId: string) => string;
  /** Target for routed “add” flows (team page uses a normal link instead of this for the main CTA). */
  createManagerHref?: string;
};

/** Closed vs create (no row) vs edit (existing user). */
type UserPanelState = User | 'create' | null;

export function UserGrid({
  tenantId,
  canManageUsers = false,
  pageIntro,
  addUserButtonPlacement = 'header',
  emptyAccountsMessage = 'No user accounts yet.',
  managerRowHref,
  createManagerHref,
}: UserGridProps) {
  const navigate = useNavigate();
  const routedManagers = Boolean(managerRowHref && createManagerHref);

  const [panel, setPanel] = useState<UserPanelState>(null);

  const openCreate = useCallback(() => {
    if (!canManageUsers) {
      return;
    }
    if (routedManagers) {
      navigate(createManagerHref);
      return;
    }
    setPanel('create');
  }, [canManageUsers, createManagerHref, navigate, routedManagers]);

  const { data, isLoading } = useTenantUsersQuery(tenantId);

  const openEdit = useCallback(
    (row: User) => {
      if (!canManageUsers) {
        return;
      }
      if (routedManagers && row._id) {
        navigate(managerRowHref(row._id));
        return;
      }
      setPanel(row);
    },
    [canManageUsers, managerRowHref, navigate, routedManagers]
  );

  const closeModal = useCallback(() => {
    setPanel(null);
  }, []);

  const modalOpen = !routedManagers && panel != null;
  const userBeingEdited = !routedManagers && panel !== null && panel !== 'create' ? panel : null;

  const addUserButton =
    addUserButtonPlacement === 'header' && canManageUsers ? (
      <Button
        variant="outline"
        type="button"
        onClick={openCreate}
        className="w-full shrink-0 sm:w-auto"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add user
      </Button>
    ) : null;

  const tableBody =
    !tenantId || isLoading ? (
      <Skeleton className="h-[min(24rem,calc(100vh-12rem))] w-full rounded-sm border" />
    ) : (
      <Card className="w-full">
        <CardHeader className="space-y-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              {pageIntro ? (
                <>
                  <CardTitle>{pageIntro.title}</CardTitle>
                  <CardDescription className="text-base">{pageIntro.description}</CardDescription>
                </>
              ) : (
                <CardTitle>Users</CardTitle>
              )}
            </div>
            {addUserButton ? <div className="shrink-0">{addUserButton}</div> : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-border bg-muted/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length ? (
                  data.map(userRow => (
                    <TableRow
                      key={userRow._id}
                      role={canManageUsers ? 'link' : undefined}
                      tabIndex={canManageUsers ? 0 : undefined}
                      className={cn(canManageUsers && 'cursor-pointer hover:bg-muted/60')}
                      onClick={() => openEdit(userRow)}
                      onKeyDown={e => {
                        if (!canManageUsers) {
                          return;
                        }
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openEdit(userRow);
                        }
                      }}
                    >
                      <TableCell>
                        {userRow.active ? (
                          <Badge className="bg-success text-primary-foreground text-xs font-normal">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-normal">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{userRow.name}</TableCell>
                      <TableCell>{userRow.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {userRow.lastActive ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {emptyAccountsMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <>
      {tableBody}

      {tenantId && !routedManagers && canManageUsers ? (
        <UserModal
          open={modalOpen}
          onClose={closeModal}
          userToEdit={userBeingEdited}
          tenantId={tenantId}
        />
      ) : null}
    </>
  );
}
