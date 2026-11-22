import { APP_ROLE, type AppRole } from '@shared/app-rbac';

export type StrictRouteEntry = {
  /** Path under `/api` (leading slash, no host). Use `:param` for dynamic segments. */
  pathPattern: string;
  methods: readonly ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  minRole: Exclude<AppRole, typeof APP_ROLE.USER>;
  /** Why this tier exists — helps when tightening more routes. */
  note?: string;
};

/**
 * **Documentation only** — routes that require more than baseline `user` (see `userScope` in
 * `api-routes.ts`). Enforcement lives on each handler via {@link requireAppRole} from
 * `require-app-role-middleware.ts`. **Keep this list in sync** when you add or change restrictions.
 *
 * **How to tighten a route**
 * 1. In the relevant `*-routes.ts`, add `requireAppRole(APP_ROLE.TENANT_ADMIN)` or `requireAppRole(APP_ROLE.ADMIN)`
 *    before the handler (or `router.use(requireAppRole(APP_ROLE.TENANT_ADMIN))` for an entire sub-router).
 * 2. Add a row here so the map stays discoverable.
 * 3. Mirror client `RoleRoute` / nav if the route has a UI.
 */
export const STRICTER_THAN_USER_ROUTES: readonly StrictRouteEntry[] = [
  {
    pathPattern: '/stripe/prices',
    methods: ['GET'],
    minRole: APP_ROLE.ADMIN,
    note: 'Stripe price catalog for tenant admin UI',
  },
  {
    pathPattern: '/analytics/tenant-summary',
    methods: ['GET'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/analytics/events',
    methods: ['GET'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/users/add-user',
    methods: ['POST'],
    minRole: APP_ROLE.TENANT_ADMIN,
  },
  {
    pathPattern: '/users/update-profile',
    methods: ['POST'],
    minRole: APP_ROLE.TENANT_ADMIN,
  },
  {
    pathPattern: '/users/resend-invite',
    methods: ['POST'],
    minRole: APP_ROLE.TENANT_ADMIN,
  },
  {
    pathPattern: '/users/:id',
    methods: ['DELETE'],
    minRole: APP_ROLE.TENANT_ADMIN,
  },
  {
    pathPattern: '/users/:id/workspace-role',
    methods: ['PATCH'],
    minRole: APP_ROLE.ADMIN,
    note: 'Promote tenant_admin vs member',
  },
  {
    pathPattern: '/tenants/get-all',
    methods: ['GET'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/tenants/create',
    methods: ['POST'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/tenants/:id/approve',
    methods: ['PATCH'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/tenants/:id/billing-flags',
    methods: ['PATCH'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/tenants/:id/stripe-price',
    methods: ['PATCH'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/tenants/:id',
    methods: ['DELETE'],
    minRole: APP_ROLE.ADMIN,
  },
  {
    pathPattern: '/tenants/backfill-trial-ends-at',
    methods: ['POST'],
    minRole: APP_ROLE.ADMIN,
  },
];
