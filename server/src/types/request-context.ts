import type { UserAndTenant } from '@shared/user';
import type { Tenant } from '@shared/tenant';

/**
 * Populated by {@link authenticateMiddleware} on protected API routes.
 * Use `req.ctx.user`, `req.ctx.tenantId`, `req.ctx.tenant`, `req.ctx.isGlobalAdmin`.
 */
export type AuthenticatedRequestContext = {
  user: UserAndTenant;
  tenant: Tenant;
  /** Normalized 24-char hex workspace id */
  tenantId: string;
  isGlobalAdmin: boolean;
};
