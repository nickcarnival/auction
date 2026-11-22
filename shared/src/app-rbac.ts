import { isGlobalTenantAdminRole } from './global-admin-role';
import { isTenantAdminRole } from './tenant-admin-role';

/**
 * Canonical coarse dashboard roles (same strings as stored/resolved {@link AppRole}).
 * Use these instead of raw string literals in `requireAppRole`, `RoleRoute`, etc.
 */
export const APP_ROLE = {
  USER: 'user',
  TENANT_ADMIN: 'tenant_admin',
  ADMIN: 'admin',
} as const;

/**
 * Coarse dashboard roles for route and nav gating.
 * - **user** — default workspace member (schedule, customers, team view, settings, …).
 * - **tenant_admin** — tenant-scoped admin (e.g. manage workspace users); includes everything `user` can do.
 * - **admin** — platform operator (cross-tenant tools); includes everything below.
 *
 * **Server:** Authenticated workspace APIs under `/api` are mounted with `requireAppRole(APP_ROLE.USER)` in
 * `api-routes.ts` unless public; stricter handlers add `requireAppRole(APP_ROLE.TENANT_ADMIN)` or `(APP_ROLE.ADMIN)`.
 * See `server/src/api/route-role-inventory.ts` for the documented list of stricter routes.
 */
export type AppRole = (typeof APP_ROLE)[keyof typeof APP_ROLE];

/** All {@link AppRole} values in hierarchy order (lowest → highest privilege). */
export const APP_ROLES_ORDERED: readonly AppRole[] = [
  APP_ROLE.USER,
  APP_ROLE.TENANT_ADMIN,
  APP_ROLE.ADMIN,
];

const APP_ROLE_RANK: Record<AppRole, number> = {
  [APP_ROLE.USER]: 0,
  [APP_ROLE.TENANT_ADMIN]: 1,
  [APP_ROLE.ADMIN]: 2,
};

/**
 * Maps stored `user.role` to a coarse {@link AppRole} for permission checks.
 */
export function resolveAppRole(dbRole: string | undefined | null): AppRole {
  if (isGlobalTenantAdminRole(dbRole)) {
    return APP_ROLE.ADMIN;
  }
  if (isTenantAdminRole(dbRole)) {
    return APP_ROLE.TENANT_ADMIN;
  }
  return APP_ROLE.USER;
}

/**
 * True when the signed-in user’s role is at least {@link required} in the hierarchy.
 */
export function hasMinimumAppRole(
  dbRole: string | undefined | null,
  required: AppRole
): boolean {
  return APP_ROLE_RANK[resolveAppRole(dbRole)] >= APP_ROLE_RANK[required];
}
