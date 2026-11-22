import { isGlobalTenantAdminRole } from './global-admin-role';

/** Tenant-scoped admin: can invite, edit, and remove dashboard users for their workspace. */
export const TENANT_ADMIN_ROLE = 'tenant_admin' as const;

export function isTenantAdminRole(role: string | undefined | null): boolean {
  return role === TENANT_ADMIN_ROLE;
}

/**
 * Whether the user may manage workspace user accounts (invite, update profile, delete, resend invite).
 * Platform operators use {@link isGlobalTenantAdminRole}; tenant operators use {@link TENANT_ADMIN_ROLE}.
 */
export function canManageWorkspaceUsers(role: string | undefined | null): boolean {
  return isGlobalTenantAdminRole(role) || isTenantAdminRole(role);
}
