import { type Tenant } from '@shared/tenant';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { BASE_URL } from '@/utils/environment-util';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  GRID_DETAIL_KEYS,
  gridColumnClass,
  gridDetailCell,
  tenantExtraFieldsJson,
  tenantGridTableClassNames as t,
} from './tenant-grid-helpers';
import { TenantDeleteConfirmDialog } from './tenant-delete-confirm-dialog';

export const TenantGrid = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-all`, { credentials: 'include' });
      return await response.json();
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`${BASE_URL}/api/tenants/${tenantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const message = await readResponseErrorMessage(response, 'Failed to delete tenant');
        throw new Error(message);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setDeletingTenant(null);
      toast.success('Deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setDeletingTenant(null);
    },
  });

  const approveTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await fetch(`${BASE_URL}/api/tenants/${tenantId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const message = await readResponseErrorMessage(response, 'Failed to approve tenant');
        throw new Error(message);
      }

      return (await response.json()) as { message?: string };
    },
    onSuccess: () => {
      toast.success('Approved');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleRowOpen = (tenant: Tenant) => {
    if (tenant._id) navigate(`/dashboard/tenant/${tenant._id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    setDeletingTenant(tenant);
  };

  const handleApproveClick = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    if (tenant._id) {
      approveTenantMutation.mutate(tenant._id);
    }
  };

  const handleConfirmDelete = () => {
    if (deletingTenant?._id) {
      deleteTenantMutation.mutate(deletingTenant._id);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <Skeleton className="h-[min(24rem,calc(100vh-14rem))] w-full rounded-sm" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">Couldn&apos;t load.</p>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table withScrollWrapper={false} className="w-max min-w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={t.thId}>_id</TableHead>
                  <TableHead className={t.thActive}>active</TableHead>
                  {GRID_DETAIL_KEYS.map(key => (
                    <TableHead key={key} className={cn(t.thBase, gridColumnClass(key))}>
                      {key}
                    </TableHead>
                  ))}
                  <TableHead className={t.thExtra}>+</TableHead>
                  <TableHead className={t.thSticky}>…</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={GRID_DETAIL_KEYS.length + 4}
                      className="h-24 px-3 py-4 text-center text-sm text-muted-foreground"
                    >
                      None.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(tenant => {
                    const extra = tenantExtraFieldsJson(tenant);
                    return (
                      <TableRow
                        key={tenant._id}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          'cursor-pointer',
                          !tenant.active && 'bg-warning-subtle/40 hover:bg-warning-subtle/55'
                        )}
                        onClick={() => handleRowOpen(tenant)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowOpen(tenant);
                          }
                        }}
                      >
                        <TableCell className={t.tdId} title={tenant._id}>
                          {tenant._id ?? '—'}
                        </TableCell>
                        <TableCell className={t.tdActive}>
                          {tenant.active ? (
                            <Badge className="bg-success px-2 py-0.5 text-xs font-normal text-primary-foreground">
                              Y
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-warning-subtle-border bg-warning-subtle/80 px-2 py-0.5 text-xs font-normal text-warning-foreground"
                            >
                              N
                            </Badge>
                          )}
                        </TableCell>
                        {GRID_DETAIL_KEYS.map(key => {
                          const val = gridDetailCell(tenant, key);
                          return (
                            <TableCell
                              key={key}
                              className={cn(t.tdBase, gridColumnClass(key))}
                              title={val.length > 120 ? val : undefined}
                            >
                              {val}
                            </TableCell>
                          );
                        })}
                        <TableCell
                          className={t.tdExtra}
                          title={extra.length > 120 ? extra : undefined}
                        >
                          {extra}
                        </TableCell>
                        <TableCell
                          className={cn(t.tdSticky, !tenant.active && 'bg-warning-subtle')}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-1">
                            {!tenant.active && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 border-success/40 text-success hover:bg-success-subtle"
                                    onClick={e => handleApproveClick(e, tenant)}
                                    disabled={approveTenantMutation.isPending}
                                    aria-label="Approve"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left">Approve</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                                  onClick={e => handleDeleteClick(e, tenant)}
                                  disabled={deleteTenantMutation.isPending}
                                  aria-label="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left">Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TenantDeleteConfirmDialog
        tenant={deletingTenant}
        onClose={() => setDeletingTenant(null)}
        onConfirmDelete={handleConfirmDelete}
        isDeleting={deleteTenantMutation.isPending}
      />
    </>
  );
};
