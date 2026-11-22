import type { Tenant } from '@shared/tenant';
import type { AuthenticatedRequestContext } from './request-context';

/**
 * Augment Express `Request` so `req.ctx` is typed everywhere (including `Request<P, Res, Body, ...>`).
 * Implemented as `.ts` (not `.d.ts`) so ts-node resolves `import './express-augment'` at dev startup.
 */
declare module 'express-serve-static-core' {
  interface Request {
    /** Set by authenticateMiddleware on protected routes. */
    ctx?: AuthenticatedRequestContext;
    /** Set by `requireTenantReadByQueryOrAdmin` before GET `/tenants/get-by-id`. */
    tenantReadAccess?: Tenant;
  }
}

export type { AuthenticatedRequestContext } from './request-context';
