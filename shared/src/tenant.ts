/**
 * ## Billing and dashboard access
 *
 * **Billable product access** (API + dashboard) is governed by {@link tenantHasBillingAccess}. The server
 * enforces it in `requireBillingAccessMiddleware` after authentication. **`/api/stripe` is registered
 * before that middleware** so Checkout, Customer Portal, and webhooks can run without an active subscription.
 *
 * ### Trial / billing concepts
 * - **`subscriptionStatus` (Stripe)** — Webhooks; `trialing` is Stripe’s billing trial.
 * - **`trialEndsAt` (app clock)** — ISO end of app-level free access; length {@link DEFAULT_APP_TRIAL_DAYS}.
 * - **`billingExempt`** — Always-on bypass (support / comps); use instead of legacy `trial` for access.
 * - **`trial` (legacy DB)** — Still stored; webhooks may clear it. **Not** used by {@link tenantHasBillingAccess}.
 *
 * **“No subscription on file”** in the UI means `subscriptionStatus` is empty — often no webhook yet.
 * That does not by itself block access while **grandfathering** applies: no `trialEndsAt` and no Stripe
 * snapshot still passes {@link tenantHasBillingAccess}. Changing that is a breaking product decision.
 *
 * ### Production operations
 * - Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; set `stripePriceId` per tenant via
 *   global-admin API (or rely on peer default when creating tenants).
 * - Register the webhook URL in Stripe Dashboard for that deploy; use the signing secret from the same
 *   environment. **Test vs live** keys must match the mode of every `price_…` id you use.
 * - App/API URLs: `client/src/utils/environment-util.ts` (browser) and
 *   `server/src/utils/client-app-origin.ts` (emails/Stripe); optional `CLIENT_APP_ORIGIN` on the server
 *   for non-default hosts.
 *
 * ### Where to change behavior
 * | Concern | Location |
 * |--------|----------|
 * | Access rules | This module — `tenantHasBillingAccess`, `isAppTrialExpiredWithoutSubscription` |
 * | HTTP 403 gate | `server/src/middleware/billing-access-middleware.ts` |
 * | Stripe → tenant fields | `server/src/api/stripe/stripe-webhook-processor.ts` |
 * | `trialEndsAt` on create/approve | `server/src/api/tenant/tenant-service.ts` |
 * | Admin billing flags | `server/src/api/tenant/tenant-routes.ts`, admin tenant billing UI |
 * | Client redirect shell | `client/src/pages/dashboard/dashboard-providers.tsx` (`BillingGate`) |
 * | Billing settings UI | `client/src/pages/dashboard/billing-page.tsx` |
 *
 * @module
 */
import * as z from 'zod';
import { observedHolidayIdsSchema } from './holidays/holiday';
import { shopClosedDatesSchema } from './holidays/tenant-closed-dates';
import { recurringScheduleBlocksSchema } from './recurring-schedule-block';
import { tenantSubdomainSlugSchema } from './tenant-subdomain-slug';

export const shopHoursSchema = z
  .object({
    daysOpen: z.array(z.number().min(0).max(6)).min(1, {
      message: 'At least one day must be selected.',
    }),
    openHour: z.number().min(0).max(23),
    closeHour: z.number().min(0).max(23),
  })
  .refine(
    data => {
      return data.closeHour > data.openHour;
    },
    {
      message: 'Closing hour must be after opening hour.',
    }
  );

export type ShopHours = z.infer<typeof shopHoursSchema>;

export const tenantSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2, {
    message: 'Tenant name must be at least 2 characters.',
  }),
  businessName: z
    .string()
    .min(2, {
      message: 'Business name must be at least 2 characters.',
    })
    .optional(),
  /** Public booking hostname prefix (`{subdomain}.your-domain`). */
  subdomain: tenantSubdomainSlugSchema.optional(),
  tier: z.enum(['global', 'customer']),
  /** Legacy field; webhooks may update. Not used for billing access — use `trialEndsAt` and `billingExempt`. */
  trial: z.boolean().optional().default(true),
  /**
   * When true, product rules (see `tenantHasBillingAccess`) treat the tenant as not requiring Stripe.
   * Global-admin only — `PATCH /tenants/:id/billing-flags`, not generic tenant update. Drives billing UI.
   */
  billingExempt: z.boolean().optional(),
  /**
   * Optional Stripe Price id (`price_…`) for Checkout; set via global-admin API.
   * **Set only via global-admin API**, never `POST /tenants/update`.
   */
  stripePriceId: z.string().optional(),
  /** Written only by server webhooks after checkout — clients must not send these to update APIs. */
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  /** Payment provider subscription status (e.g. active, trialing, canceled). */
  subscriptionStatus: z.string().optional(),
  /** ISO 8601 end of current billing period (from subscription.current_period_end). Server-only. */
  subscriptionCurrentPeriodEnd: z.string().optional(),
  /**
   * When the tenant’s **app-level** free trial ends (set on first activation / approval).
   * After this instant, {@link tenantHasBillingAccess} requires Stripe in good standing unless exempt.
   * Omitted on older tenants (grandfathered until they have Stripe activity).
   */
  trialEndsAt: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  active: z.boolean().optional().default(true),
  lastLogin: z.string().optional(),
  redirectUrl: z.string().optional(),
  shopHours: shopHoursSchema.optional().default({
    daysOpen: [1, 2, 3, 4, 5], // Monday to Friday
    openHour: 9,
    closeHour: 18,
  }),
  /**
   * Holiday `code` values this tenant observes (non-working when scheduling honors holidays).
   * Stored on the tenant document only; global `holidays` collection is the read-only catalog.
   */
  observedHolidayIds: observedHolidayIdsSchema.optional().default([]),
  /**
   * Additional full calendar days the shop is closed (local `YYYY-MM-DD`), merged with observed
   * federal dates for scheduling and calendar styling.
   */
  shopClosedDates: shopClosedDatesSchema.optional().default([]),
  /**
   * Recurring on-calendar time blocks (team meetings, training, etc.). Stored on tenant;
   * schedule UI may expand these into events in the future.
   */
  recurringScheduleBlocks: recurringScheduleBlocksSchema.optional().default([]),
  /**
   * Pending booking requests older than this many days (by `createdDate`) get an automatic follow-up:
   * today's `followUpAt`, staff note, cleared read state, once per request (`lastStaleAutoFollowUpAt`).
   * **Default** when omitted in DB is 30 days (see `DEFAULT_PENDING_REQUEST_STALE_DAYS` / server clamp).
   */
  pendingRequestStaleDays: z.coerce.number().int().min(7).max(365).optional(),
});
export type Tenant = z.infer<typeof tenantSchema>;

/** Default length for new tenants’ {@link Tenant.trialEndsAt} (app trial, not Stripe’s trialing). */
export const DEFAULT_APP_TRIAL_DAYS = 30;

/** Default for {@link Tenant.pendingRequestStaleDays} (auto follow-up on old pending requests). */
export const DEFAULT_PENDING_REQUEST_STALE_DAYS = 30;

function trialEndsAtToMs(iso: string | null | undefined): number | null {
  if (iso == null || typeof iso !== 'string' || !iso.trim()) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * True while `trialEndsAt` is in the future (app free period). Does not imply Stripe subscription.
 */
export function isWithinAppTrialPeriod(
  tenant: Pick<Tenant, 'trialEndsAt'> | null | undefined
): boolean {
  const ms = trialEndsAtToMs(tenant?.trialEndsAt);
  return ms !== null && Date.now() < ms;
}

/** Good standing: shown as entitled in UI, Subscribe hidden, portal available. */
const ENTITLED_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const;

/**
 * Still has an ongoing subscription relationship (including payment retry).
 * `past_due`: Stripe retries payment; we keep access as a grace period (see `tenantHasBillingAccess`).
 */
const SUBSCRIPTION_IN_GOOD_OR_GRACE_STATUSES = ['active', 'trialing', 'past_due'] as const;

/**
 * Whether the tenant may use billable product features (Stripe in good standing, app trial window,
 * grandfather rows, or `billingExempt`).
 *
 * **Grandfather (no `trialEndsAt`):** no Stripe snapshot → still allowed (legacy production).
 *
 * **`trialEndsAt` set:** until that instant, access without Stripe. Afterward, requires Stripe
 * `active` / `trialing` / `past_due`, or `billingExempt`.
 *
 * Support bypass: set **`billingExempt`** (global admin) — not the legacy `trial` boolean.
 */
export function tenantHasBillingAccess(
  tenant:
    | Pick<Tenant, 'trialEndsAt' | 'subscriptionStatus' | 'stripeCustomerId' | 'billingExempt'>
    | null
    | undefined
): boolean {
  if (!tenant) return false;

  if (tenant.billingExempt === true) return true;

  const status = tenant.subscriptionStatus;
  const stripeInGoodStanding =
    Boolean(status?.trim()) &&
    SUBSCRIPTION_IN_GOOD_OR_GRACE_STATUSES.includes(
      status as (typeof SUBSCRIPTION_IN_GOOD_OR_GRACE_STATUSES)[number]
    );

  if (stripeInGoodStanding) {
    return true;
  }

  const hasStripeBillingRecord =
    Boolean(tenant.stripeCustomerId?.trim()) || Boolean(tenant.subscriptionStatus?.trim());

  const trialEndMs = trialEndsAtToMs(tenant.trialEndsAt);
  const hasAppTrialEnd = trialEndMs !== null;

  if (hasAppTrialEnd && Date.now() < trialEndMs) {
    return true;
  }

  if (!hasAppTrialEnd && !hasStripeBillingRecord) {
    return true;
  }

  return false;
}

/** API JSON `code` when {@link tenantHasBillingAccess} fails (403). */
export const BILLING_ACCESS_DENIED_CODE = 'BILLING_REQUIRED' as const;

export const BILLING_ACCESS_DENIED_MESSAGE =
  'This tenant does not have an active subscription. Update billing to continue.';

/**
 * True when the tenant has a paid subscription flow (portal, no new Subscribe).
 * Includes `past_due` so customers can fix payment without starting a second checkout.
 */
export function tenantHasStripeEntitlement(
  tenant: Pick<Tenant, 'subscriptionStatus'> | null | undefined
): boolean {
  const status = tenant?.subscriptionStatus;
  return (
    status != null &&
    SUBSCRIPTION_IN_GOOD_OR_GRACE_STATUSES.includes(
      status as (typeof SUBSCRIPTION_IN_GOOD_OR_GRACE_STATUSES)[number]
    )
  );
}

/**
 * `trialEndsAt` is set and in the past, and Stripe is not in good standing — show the
 * trial-expired subscribe page instead of only the generic billing screen.
 */
export function isAppTrialExpiredWithoutSubscription(
  tenant: Pick<Tenant, 'trialEndsAt' | 'subscriptionStatus'> | null | undefined
): boolean {
  if (!tenant?.trialEndsAt?.trim()) return false;
  if (isWithinAppTrialPeriod(tenant)) return false;
  if (tenantHasStripeEntitlement(tenant)) return false;
  return true;
}

/** Active or trial only — for messaging that requires payment in good standing. */
export function tenantSubscriptionInGoodStanding(
  tenant: Pick<Tenant, 'subscriptionStatus'> | null | undefined
): boolean {
  const status = tenant?.subscriptionStatus;
  return (
    status != null &&
    ENTITLED_SUBSCRIPTION_STATUSES.includes(
      status as (typeof ENTITLED_SUBSCRIPTION_STATUSES)[number]
    )
  );
}

/**
 * Label for public booking UI. DB rows may omit `name`; rendering it would show "null" in the tab or headings.
 */
export function getTenantDisplayTitle(
  tenant: Partial<Pick<Tenant, 'name' | 'businessName'>> | null | undefined,
  tenantCode?: string | null,
  /** Hostname subdomain when API omits `tenantCode` (e.g. odd JSON). */
  hostnameSubdomain?: string | null
): string {
  for (const value of [tenant?.name, tenant?.businessName, tenantCode, hostnameSubdomain]) {
    if (value == null || typeof value === 'object') continue;
    const s = String(value).trim();
    const lower = s.toLowerCase();
    if (s && lower !== 'null' && lower !== 'undefined') return s;
  }
  return 'Book service';
}

/** First non-empty business name (DB may store `businessName` without `name`). */
export function pickPrimaryBusinessName(
  tenant: Partial<Pick<Tenant, 'name' | 'businessName'>> | null | undefined
): string {
  if (!tenant) return '';
  for (const value of [tenant.name, tenant.businessName]) {
    if (value == null || typeof value === 'object') continue;
    const s = String(value).trim();
    const lower = s.toLowerCase();
    if (s && lower !== 'null' && lower !== 'undefined') return s;
  }
  return '';
}
