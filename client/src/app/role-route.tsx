import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { APP_ROLE, type AppRole, hasMinimumAppRole } from '@shared/app-rbac';
import { useAuth } from '@/pages/auth/auth-provider';
import { TECHNICIANS_PATH } from '@/lib/technician-settings-url';

type RoleRouteProps = {
  minRole: AppRole;
  children: ReactNode;
  /**
   * Where to send users who lack access.
   * Defaults: `admin` → schedule; `tenant_admin` → team overview; `user` → login.
   */
  fallbackTo?: string;
};

/**
 * Declarative route guard: renders `children` only if the session meets {@link minRole}.
 */
export function RoleRoute({ minRole, children, fallbackTo }: RoleRouteProps) {
  const { user } = useAuth();
  if (!hasMinimumAppRole(user?.role, minRole)) {
    const to =
      fallbackTo ??
      (minRole === APP_ROLE.ADMIN
        ? '/dashboard/schedule'
        : minRole === APP_ROLE.TENANT_ADMIN
          ? TECHNICIANS_PATH
          : '/login');
    return <Navigate to={to} replace />;
  }
  return <>{children}</>;
}
