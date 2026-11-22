import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TENANT_USERS_QUERY_KEY } from '@/hooks/use-tenant-users-query';
import { BASE_URL } from '@/utils/environment-util';
import type { User } from '@shared/user';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

export type UserModalFormValues = {
  name: string;
  email: string;
};

type UseUserModalOptions = {
  tenantId: string;
  userToEdit: User | null;
  currentUserId: string | undefined;
  onClose: () => void;
  /**
   * When false, a successful profile update does not call {@link onClose} (stay on detail page).
   * @default true
   */
  closeOnUpdateSuccess?: boolean;
};

export function useUserModal({
  tenantId,
  userToEdit,
  currentUserId,
  onClose,
  closeOnUpdateSuccess = true,
}: UseUserModalOptions) {
  const queryClient = useQueryClient();
  const listQueryKey = useMemo(() => [TENANT_USERS_QUERY_KEY, tenantId] as const, [tenantId]);

  const isEditMode = Boolean(userToEdit?._id);
  const canDelete = isEditMode && userToEdit?._id != null && userToEdit._id !== currentUserId;
  const showResendInvite = Boolean(isEditMode && userToEdit && userToEdit.active !== true);
  const hasSecondaryActions = showResendInvite || canDelete;

  const inviteMutation = useMutation({
    mutationFn: async (values: UserModalFormValues) => {
      const response = await fetch(`${BASE_URL}/api/users/add-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            name: values.name,
            email: values.email,
            tenantId,
          },
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Request failed'));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      onClose();
      toast.success('Invitation sent');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UserModalFormValues) => {
      if (!userToEdit?._id) {
        throw new Error('No user selected');
      }
      const response = await fetch(`${BASE_URL}/api/users/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          _id: userToEdit._id,
          name: values.name,
          email: values.email,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Request failed'));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      if (closeOnUpdateSuccess) {
        onClose();
      }
      toast.success('User updated');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!userToEdit?._id) {
        throw new Error('No user selected');
      }
      const response = await fetch(`${BASE_URL}/api/users/resend-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userToEdit._id }),
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Request failed'));
      }
    },
    onSuccess: () => {
      toast.success('Invitation resent');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!userToEdit?._id) {
        throw new Error('No user selected');
      }
      const response = await fetch(`${BASE_URL}/api/users/${userToEdit._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Request failed'));
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      onClose();
      toast.success('User removed');
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    },
  });

  const busy =
    inviteMutation.isPending ||
    updateMutation.isPending ||
    resendMutation.isPending ||
    deleteMutation.isPending;

  const submit = (values: UserModalFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(values);
    } else {
      inviteMutation.mutate(values);
    }
  };

  const deleteUser = () => {
    if (
      !canDelete ||
      !confirm(
        `Remove ${userToEdit?.name ?? 'this user'}? Pending invites will be canceled. This cannot be undone.`
      )
    ) {
      return;
    }
    deleteMutation.mutate();
  };

  return {
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
  };
}

export type UserModalHandle = ReturnType<typeof useUserModal>;

/** Sync dialog body fields when `open` / `userToEdit` changes — use inside the modal with `useForm`. */
export function getUserModalFormDefaults(userToEdit: User | null): UserModalFormValues {
  if (userToEdit) {
    return {
      name: userToEdit.name ?? '',
      email: userToEdit.email ?? '',
    };
  }
  return { name: '', email: '' };
}
