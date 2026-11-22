import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserAccountEditor } from '@/components/user/user-account-editor';
import {
  getUserModalFormDefaults,
  useUserModal,
} from '@/components/user/use-user-modal';
import { useTenantUsersQuery } from '@/hooks/use-tenant-users-query';
import { TECHNICIANS_PATH } from '@/lib/technician-settings-url';
import { useAuth } from '@/pages/auth/auth-provider';
import { canManageWorkspaceUsers } from '@shared/tenant-admin-role';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Enter a valid email' }),
});

type ManagerForm = z.infer<typeof formSchema>;

export default function WorkspaceManagerPage() {
  const { managerId } = useParams<{ managerId?: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const tenantId = authUser?.tenantId;
  const isCreate = managerId === undefined;

  const { data: managers, isLoading } = useTenantUsersQuery(tenantId);

  const userToEdit =
    !isCreate && managerId
      ? managers?.find(u => u._id === managerId) ?? null
      : null;

  const goBack = () => {
    navigate(TECHNICIANS_PATH);
  };

  const form = useForm<ManagerForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '' },
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
  } = useUserModal({
    tenantId: tenantId ?? '',
    userToEdit,
    currentUserId: authUser?._id,
    onClose: goBack,
    closeOnUpdateSuccess: false,
  });

  useEffect(() => {
    form.reset(getUserModalFormDefaults(userToEdit));
  }, [userToEdit, form]);

  if (!tenantId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Sign in to manage team members.</p>
      </div>
    );
  }

  if (!canManageWorkspaceUsers(authUser?.role)) {
    return <Navigate to={TECHNICIANS_PATH} replace />;
  }

  if (!isCreate && !isLoading && managers && !userToEdit) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-12">
        <p className="text-muted-foreground">Manager not found.</p>
        <Button variant="outline" asChild>
          <Link to={TECHNICIANS_PATH}>Back to team</Link>
        </Button>
      </div>
    );
  }

  const showSkeleton = !isCreate && isLoading && !userToEdit;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-6 pt-2 lg:pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" type="button" asChild>
          <Link to={TECHNICIANS_PATH}>Back to team</Link>
        </Button>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {showSkeleton ? (
            <div className="space-y-4 py-2">
              <div className="h-10 max-w-md animate-pulse rounded-md bg-muted" />
              <div className="h-24 max-w-lg animate-pulse rounded-md bg-muted" />
              <div className="h-10 max-w-xs animate-pulse rounded-md bg-muted" />
            </div>
          ) : (
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
              onCancel={goBack}
              onResendInvite={() => resendMutation.mutate()}
              onDelete={deleteUser}
              submitLabelInvite="Send invitation"
              submitLabelSave="Save changes"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
