import { describe, it, expect } from 'vitest';
import { ADMIN_ROLE } from './global-admin-role';
import { canManageWorkspaceUsers, isTenantAdminRole, TENANT_ADMIN_ROLE } from './tenant-admin-role';

describe('tenant admin role', () => {
  it('isTenantAdminRole is true only for tenant_admin', () => {
    expect(isTenantAdminRole(TENANT_ADMIN_ROLE)).toBe(true);
    expect(isTenantAdminRole('user')).toBe(false);
    expect(isTenantAdminRole(ADMIN_ROLE)).toBe(false);
  });

  it('canManageWorkspaceUsers includes platform admin and tenant admin', () => {
    expect(canManageWorkspaceUsers(ADMIN_ROLE)).toBe(true);
    expect(canManageWorkspaceUsers(TENANT_ADMIN_ROLE)).toBe(true);
    expect(canManageWorkspaceUsers('user')).toBe(false);
    expect(canManageWorkspaceUsers(undefined)).toBe(false);
  });
});
