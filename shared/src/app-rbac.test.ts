import { describe, it, expect } from 'vitest';
import { ADMIN_ROLE } from './global-admin-role';
import { TENANT_ADMIN_ROLE } from './tenant-admin-role';
import { APP_ROLE, APP_ROLES_ORDERED, hasMinimumAppRole, resolveAppRole } from './app-rbac';

describe('app-rbac', () => {
  it('APP_ROLE matches DB role string constants', () => {
    expect(APP_ROLE.ADMIN).toBe(ADMIN_ROLE);
    expect(APP_ROLE.TENANT_ADMIN).toBe(TENANT_ADMIN_ROLE);
  });

  it('resolveAppRole maps platform and tenant admins', () => {
    expect(resolveAppRole(ADMIN_ROLE)).toBe(APP_ROLE.ADMIN);
    expect(resolveAppRole(TENANT_ADMIN_ROLE)).toBe(APP_ROLE.TENANT_ADMIN);
    expect(resolveAppRole(APP_ROLE.USER)).toBe(APP_ROLE.USER);
    expect(resolveAppRole(undefined)).toBe(APP_ROLE.USER);
  });

  it('hasMinimumAppRole enforces hierarchy', () => {
    expect(hasMinimumAppRole(undefined, APP_ROLE.USER)).toBe(true);
    expect(hasMinimumAppRole(APP_ROLE.USER, APP_ROLE.TENANT_ADMIN)).toBe(false);
    expect(hasMinimumAppRole(TENANT_ADMIN_ROLE, APP_ROLE.TENANT_ADMIN)).toBe(true);
    expect(hasMinimumAppRole(TENANT_ADMIN_ROLE, APP_ROLE.ADMIN)).toBe(false);
    expect(hasMinimumAppRole(ADMIN_ROLE, APP_ROLE.ADMIN)).toBe(true);
    expect(hasMinimumAppRole(ADMIN_ROLE, APP_ROLE.USER)).toBe(true);
  });

  it('APP_ROLES_ORDERED lists every AppRole once in rank order', () => {
    expect(APP_ROLES_ORDERED).toEqual([APP_ROLE.USER, APP_ROLE.TENANT_ADMIN, APP_ROLE.ADMIN]);
  });
});
