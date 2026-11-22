import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Form } from '@/components/ui/form/form';
import { GenericField } from '@/components/ui/form/generic-field';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2, MailPlus, PlusCircle, Trash2, UserRound } from 'lucide-react';
import type { User } from '@shared/user';
import { cn } from '@/lib/utils';
import type { UserModalFormValues, UserModalHandle } from './use-user-modal';

type UserAccountEditorProps = {
  form: UseFormReturn<UserModalFormValues>;
  isEditMode: boolean;
  userToEdit: User | null;
  showResendInvite: boolean;
  canDelete: boolean;
  hasSecondaryActions: boolean;
  busy: boolean;
  inviteMutation: UserModalHandle['inviteMutation'];
  updateMutation: UserModalHandle['updateMutation'];
  resendMutation: UserModalHandle['resendMutation'];
  deleteMutation: UserModalHandle['deleteMutation'];
  onSubmit: (values: UserModalFormValues) => void;
  onCancel: () => void;
  onResendInvite: () => void;
  onDelete: () => void;
  submitLabelInvite: string;
  submitLabelSave: string;
  /** When false, omit the top title row (e.g. the dialog already has a title). @default true */
  showFormHeader?: boolean;
};

/**
 * Shared name/email form and actions for workspace user invite & edit (modal or full page).
 */
export function UserAccountEditor({
  form,
  isEditMode,
  userToEdit,
  showResendInvite,
  canDelete,
  hasSecondaryActions,
  busy,
  inviteMutation,
  updateMutation,
  resendMutation,
  deleteMutation,
  onSubmit,
  onCancel,
  onResendInvite,
  onDelete,
  submitLabelInvite,
  submitLabelSave,
  showFormHeader = true,
}: UserAccountEditorProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {showFormHeader ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
            {isEditMode ? (
              <>
                <UserRound className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
                <h2 className="text-lg font-semibold tracking-tight">Edit manager</h2>
              </>
            ) : (
              <>
                <PlusCircle className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
                <h2 className="text-lg font-semibold tracking-tight">Invite manager</h2>
              </>
            )}
            {isEditMode && userToEdit ? (
              <Badge
                className={
                  userToEdit.active
                    ? 'bg-success text-primary-foreground text-xs font-normal'
                    : 'text-xs font-normal'
                }
                variant={userToEdit.active ? 'default' : 'outline'}
              >
                {userToEdit.active ? 'Active' : 'Pending'}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <GenericField form={form} name="name" label="Name" placeholder="Full name" />
          <GenericField
            form={form}
            name="email"
            label="Email"
            type="email"
            placeholder="name@company.com"
          />
        </div>

        <div
          className={cn(
            'mt-2 flex w-full flex-col gap-3 pt-1 sm:mt-0 sm:flex-row sm:items-center sm:gap-4 sm:pt-0',
            hasSecondaryActions ? 'sm:justify-between' : 'sm:justify-end'
          )}
        >
          {hasSecondaryActions ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-start">
              {showResendInvite ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  className="flex-1 gap-1 sm:flex-initial"
                  onClick={onResendInvite}
                >
                  {resendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <MailPlus className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  Resend invite
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  disabled={busy}
                  className="h-9 w-9 shrink-0"
                  aria-label="Remove manager"
                  title="Remove manager"
                  onClick={onDelete}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-none sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              className="flex-1 sm:flex-initial"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              size="sm"
              disabled={busy}
              className="flex-1 gap-1 sm:min-w-[10rem] sm:flex-initial"
            >
              {(inviteMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              )}
              {isEditMode ? submitLabelSave : submitLabelInvite}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
