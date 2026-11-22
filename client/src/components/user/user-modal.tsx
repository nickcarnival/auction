import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, UserRound } from 'lucide-react';
import { useAuth } from '@/pages/auth/auth-provider';
import { useEffect } from 'react';
import type { User } from '@shared/user';
import { z } from 'zod';
import { getUserModalFormDefaults, useUserModal } from './use-user-modal';
import { UserAccountEditor } from './user-account-editor';

const userModalFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Enter a valid email' }),
});

type UserModalForm = z.infer<typeof userModalFormSchema>;

type UserModalProps = {
  open: boolean;
  onClose: () => void;
  /** When null and the dialog is open, opens in “invite new user” mode. */
  userToEdit: User | null;
  /** Tenant users belong to (required for invite and cache invalidation). */
  tenantId: string;
};

export function UserModal({ open, onClose, userToEdit, tenantId }: UserModalProps) {
  const { user: authUser } = useAuth();
  const form = useForm<UserModalForm>({
    resolver: zodResolver(userModalFormSchema),
    defaultValues: { name: '', email: '' },
  });

  const controller = useUserModal({
    tenantId,
    userToEdit,
    currentUserId: authUser?._id,
    onClose,
  });

  const {
    isEditMode,
    canDelete,
    showResendInvite,
    hasSecondaryActions,
    inviteMutation,
    updateMutation,
    resendMutation,
    deleteMutation,
    busy,
    submit,
    deleteUser,
  } = controller;

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(getUserModalFormDefaults(userToEdit));
  }, [open, userToEdit, form]);

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="w-full max-w-lg"
        onInteractOutside={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {isEditMode ? (
              <>
                <UserRound className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
                Edit user
              </>
            ) : (
              <>
                <PlusCircle className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
                Invite user
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
          </DialogTitle>
        </DialogHeader>

        <UserAccountEditor
          form={form}
          isEditMode={isEditMode}
          userToEdit={userToEdit}
          showResendInvite={showResendInvite}
          canDelete={canDelete}
          hasSecondaryActions={hasSecondaryActions}
          busy={busy}
          inviteMutation={inviteMutation}
          updateMutation={updateMutation}
          resendMutation={resendMutation}
          deleteMutation={deleteMutation}
          onSubmit={submit}
          onCancel={onClose}
          onResendInvite={() => resendMutation.mutate()}
          onDelete={deleteUser}
          submitLabelInvite="Send invitation"
          submitLabelSave="Save changes"
          showFormHeader={false}
        />
      </DialogContent>
    </Dialog>
  );
}
