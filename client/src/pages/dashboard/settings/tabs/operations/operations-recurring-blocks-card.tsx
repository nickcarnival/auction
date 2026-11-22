import { useResourceContext } from '@/components/resources/resource-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BASE_URL } from '@/utils/environment-util';
import type { ShopHours } from '@shared/tenant';
import type { RecurringScheduleBlock } from '@shared/recurring-schedule-block';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { toast } from 'sonner';
import { useCallback, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { RecurringBlockDialog } from './recurring-block-dialog';
import { DAYS_OF_WEEK, HOUR_OPTIONS } from './operations-constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function formatBlockSummary(
  block: RecurringScheduleBlock,
  resourceNames: Map<string, string>
): string {
  const interval =
    block.interval === 'weekly'
      ? `Weekly · ${DAYS_OF_WEEK.find(d => d.value === block.dayOfWeek)?.label ?? '?'}`
      : `Monthly · day ${block.dayOfMonth ?? '?'}`;
  const start =
    HOUR_OPTIONS.find(h => h.value === block.startHour)?.label ?? `${block.startHour}:00`;
  const techs = block.resourceIds.map(id => resourceNames.get(id) ?? 'Technician').join(', ');
  return `${interval} · ${start} · ${block.durationHours}h · ${techs}`;
}

type OperationsRecurringBlocksCardProps = {
  tenantId: string | undefined;
  shopHours: ShopHours;
  blocks: RecurringScheduleBlock[];
};

export function OperationsRecurringBlocksCard({
  tenantId,
  shopHours,
  blocks,
}: OperationsRecurringBlocksCardProps) {
  const { resources } = useResourceContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringScheduleBlock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringScheduleBlock | null>(null);

  const resourceNames = useCallback(() => {
    const m = new Map<string, string>();
    for (const r of resources) {
      if (r._id) m.set(r._id, r.name);
    }
    return m;
  }, [resources]);

  const saveMutation = useMutation({
    mutationFn: async (nextBlocks: RecurringScheduleBlock[]) => {
      const response = await fetch(`${BASE_URL}/api/tenants/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          _id: tenantId,
          recurringScheduleBlocks: nextBlocks,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to save recurring blocks')
        );
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-by-id'] });
      queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      toast.success('Recurring blocks saved');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Failed to save');
    },
  });

  const persist = useCallback(
    (next: RecurringScheduleBlock[]) => {
      if (!tenantId) return;
      saveMutation.mutate(next);
    },
    [tenantId, saveMutation]
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (block: RecurringScheduleBlock) => {
    setEditing(block);
    setDialogOpen(true);
  };

  const onSaveFromDialog = (block: RecurringScheduleBlock) => {
    const names = resourceNames();
    const exists = blocks.some(b => b.id === block.id);
    const next = exists ? blocks.map(b => (b.id === block.id ? block : b)) : [...blocks, block];
    if (block.resourceIds.some(id => !names.has(id))) {
      toast.error('Remove technicians that are no longer on the team.');
      return;
    }
    persist(next);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    persist(blocks.filter(b => b.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <Card id="recurring-events" className="scroll-mt-6">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>Recurring Events</CardTitle>
          <CardDescription>
            Repeating internal time on your calendar (meetings, training, cleanup) without creating
            a client booking. Times follow your open hours in Business hours above; pick which
            technicians are included.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 gap-1 sm:mt-0.5"
          disabled={!tenantId || saveMutation.isPending}
          onClick={openCreate}
        >
          <Plus className="size-3.5" aria-hidden />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring blocks yet.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map(block => {
              const namesMap = resourceNames();
              return (
                <li
                  key={block.id}
                  className={`flex items-center gap-1 rounded-md border border-border bg-muted/40 text-sm shadow-sm transition-[background-color,box-shadow] duration-150 hover:bg-muted hover:shadow-md ${saveMutation.isPending ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer rounded-sm px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
                    onClick={() => openEdit(block)}
                    disabled={saveMutation.isPending}
                    aria-label={`Edit recurring block: ${block.title}`}
                  >
                    <div className="font-medium text-foreground">{block.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBlockSummary(block, namesMap)}
                    </div>
                    {block.note?.trim() ? (
                      <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                        {block.note.trim()}
                      </p>
                    ) : null}
                  </button>
                  <div className="flex shrink-0 gap-0.5 pr-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label={`Edit ${block.title}`}
                      onClick={() => openEdit(block)}
                      disabled={saveMutation.isPending}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      aria-label={`Remove ${block.title}`}
                      onClick={() => setDeleteTarget(block)}
                      disabled={saveMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <RecurringBlockDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          shopHours={shopHours}
          techniciansResources={resources}
          editing={editing}
          onSave={onSaveFromDialog}
          onDelete={block => {
            setDialogOpen(false);
            setDeleteTarget(block);
          }}
        />

        <Dialog open={deleteTarget != null} onOpenChange={open => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove recurring block?</DialogTitle>
              <DialogDescription>
                {deleteTarget ? (
                  <>
                    <span className="font-medium text-foreground">{deleteTarget.title}</span> will
                    be removed from your tenant settings.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
