import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '@/errors/api-error';
import {
  BILLING_ACCESS_DENIED_CODE,
  BILLING_ACCESS_DENIED_MESSAGE,
  tenantHasBillingAccess,
} from '@shared/tenant';

/**
 * Paths on the **authenticated** router that stay available without billing access.
 * (The entire `/api/stripe` router is mounted **before** this middleware in `api-routes.ts`.)
 */
function isBillingExemptPath(path: string): boolean {
  if (path === '/users/get-by-token' || path === '/tenants/get-by-id') {
    return true;
  }
  return false;
}

/**
 * After {@link authenticateMiddleware}: blocks billable API usage when
 * {@link tenantHasBillingAccess} is false. Global platform admins bypass.
 *
 * Stripe Checkout, portal, and webhooks are **not** behind this gate — see router order in
 * `server/src/api/api-routes.ts`.
 */
export function requireBillingAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.ctx?.isGlobalAdmin) {
    next();
    return;
  }

  const path = req.path || '';
  if (isBillingExemptPath(path)) {
    next();
    return;
  }

  const tenant = req.ctx?.tenant;
  if (tenantHasBillingAccess(tenant)) {
    next();
    return;
  }

  res
    .status(403)
    .json(
      ApiError.forbidden(BILLING_ACCESS_DENIED_CODE, BILLING_ACCESS_DENIED_MESSAGE).toJSON()
    );
}
