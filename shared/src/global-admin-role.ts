/** Database value for cross-tenant operators (tenant grid, sensitive tenant APIs). */
export const ADMIN_ROLE = 'admin' as const;

/**
 * True only for accounts with {@link ADMIN_ROLE}. Other roles (including missing role) are not global admins.
 */
export function isGlobalTenantAdminRole(role: string | undefined | null): boolean {
  return role === ADMIN_ROLE;
}
