import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_URL } from '@/utils/environment-util';
import type { User } from '@shared/user';
import { fetchJsonOrThrow } from '@/lib/api-response';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { TENANT_ADMIN_ROLE } from '@shared/tenant-admin-role';

type AdminTenantWorkspaceRolesCardProps = {
  tenantId: string;
};

type WorkspaceRoleValue = typeof TENANT_ADMIN_ROLE | 'user';

function workspaceRoleFromUser(role: string | undefined): WorkspaceRoleValue {
  return role === TENANT_ADMIN_ROLE ? TENANT_ADMIN_ROLE : 'user';
}

/**
 * Global-admin only: assign `tenant_admin` vs `user` for dashboard accounts in this tenant.
 */
export function AdminTenantWorkspaceRolesCard({ tenantId }: AdminTenantWorkspaceRolesCardProps) {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      const response = await fetch(
        `${BASE_URL}/api/users/get-by-tenant-id?tenantId=${encodeURIComponent(tenantId)}`,
        { credentials: 'include' }
      );
      return fetchJsonOrThrow<User[]>(response, 'Failed to load users');
    },
    enabled: !!tenantId,
  });

  const patchRole = useMutation({
    mutationFn: async (payload: { userId: string; workspaceRole: WorkspaceRoleValue }) => {
      const response = await fetch(
        `${BASE_URL}/api/users/${encodeURIComponent(payload.userId)}/workspace-role`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceRole: payload.workspaceRole,
            tenantId,
          }),
        }
      );
      return fetchJsonOrThrow<{ ok: boolean }>(response, 'Failed to update role');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
      await queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      toast.success('Workspace role updated');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    },
  });

  if (!tenantId || isLoading) {
    return <Skeleton className="h-48 w-full min-w-0 rounded-md border" />;
  }

  const rows = users ?? [];

  return (
    <Card className="min-w-0 shrink-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Workspace roles</CardTitle>
        <CardDescription className="text-sm">
          <strong>Tenant admins</strong> can invite, edit, and remove dashboard users for this business.
          Platform accounts keep the <span className="font-mono text-xs">admin</span> role here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border border-border bg-muted/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[200px]">Workspace access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No users in this tenant.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(u => {
                  const isPlatform = isGlobalTenantAdminRole(u.role);
                  const value = workspaceRoleFromUser(u.role);
                  return (
                    <TableRow key={u._id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {isPlatform ? (
                          <Badge variant="secondary" className="font-normal">
                            Platform admin
                          </Badge>
                        ) : (
                          <Select
                            value={value}
                            disabled={patchRole.isPending}
                            onValueChange={next => {
                              if (next !== TENANT_ADMIN_ROLE && next !== 'user') {
                                return;
                              }
                              if (next === value) {
                                return;
                              }
                              patchRole.mutate({
                                userId: u._id!,
                                workspaceRole: next,
                              });
                            }}
                          >
                            <SelectTrigger className="h-9 w-[min(100%,12rem)]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Member</SelectItem>
                              <SelectItem value={TENANT_ADMIN_ROLE}>Tenant admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {!rows.some(u => u.role === TENANT_ADMIN_ROLE) ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No <strong>Tenant admin</strong> yet — promote someone so they can manage users without platform
            access.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
