import type { NextFunction, Request, Response } from 'express';
import type { AppRole } from '@shared/app-rbac';
import { hasMinimumAppRole } from '@shared/app-rbac';
import { ApiError } from '@/errors/api-error';

/**
 * Requires an authenticated session whose `user.role` meets {@link minRole}
 * (see {@link hasMinimumAppRole} in `@shared/app-rbac`).
 *
 * **Mount order** (typical): `authenticateMiddleware` → `userScope` (`requireAppRole(APP_ROLE.USER)` in
 * `api-routes.ts`) → route router → optional extra `requireAppRole(APP_ROLE.TENANT_ADMIN|APP_ROLE.ADMIN)`
 * on specific handlers. Stricter middleware runs **after** `user` and **narrows** access.
 *
 * **Ways to apply**
 * - **Single route:** `router.get('/path', requireAppRole(APP_ROLE.TENANT_ADMIN), handler)`
 * - **Whole sub-router file:** `router.use(requireAppRole(APP_ROLE.TENANT_ADMIN));` then declare routes.
 * - **Mount in `api-routes.ts`:** `router.use('/segment', userScope, requireAppRole(APP_ROLE.TENANT_ADMIN), subRouter)` — rare; prefer per-handler unless every path in `subRouter` shares one tier.
 *
 * **Inventory:** see `STRICTER_THAN_USER_ROUTES` in `server/src/api/route-role-inventory.ts` — update it when you add restrictions.
 *
 * Use after {@link authenticateMiddleware}.
 */
export function requireAppRole(minRole: AppRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.ctx?.user;
    if (!user?._id) {
      res.status(401).json(ApiError.unauthorized('AUTH_REQUIRED', 'Authentication required').toJSON());
      return;
    }
    if (!hasMinimumAppRole(user.role, minRole)) {
      res.status(403).json(ApiError.forbidden('FORBIDDEN', 'Insufficient permissions').toJSON());
      return;
    }
    next();
  };
}
