import { Fragment, useMemo } from 'react';
import { pickPrimaryBusinessName, type Tenant } from '@shared/tenant';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildDeleteConfirmRows } from './tenant-grid-helpers';

type TenantDeleteConfirmDialogProps = {
  tenant: Tenant | null;
  onClose: () => void;
  onConfirmDelete: () => void;
  isDeleting: boolean;
};

export function TenantDeleteConfirmDialog({
  tenant,
  onClose,
  onConfirmDelete,
  isDeleting,
}: TenantDeleteConfirmDialogProps) {
  const rows = useMemo(() => (tenant ? buildDeleteConfirmRows(tenant) : []), [tenant]);

  return (
    <Dialog open={tenant != null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete tenant</DialogTitle>
          <DialogDescription className="text-left">
            {tenant
              ? pickPrimaryBusinessName(tenant) || tenant.name || tenant._id
              : ''}{' '}
            — removes all tenant data. Can&apos;t undo.
          </DialogDescription>
        </DialogHeader>
        {tenant ? (
          <div
            className="max-h-[min(50vh,22rem)] overflow-y-auto rounded-sm border border-border bg-muted/40 px-3 py-2"
            aria-label="Tenant record"
          >
            <dl className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(8.5rem,auto)_1fr]">
              {rows.map((row, i) => (
                <Fragment key={`${row.label}-${i}`}>
                  <dt className="shrink-0 font-medium text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 break-words font-normal text-foreground">{row.value}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        ) : null}
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirmDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
