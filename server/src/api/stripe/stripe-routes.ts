import type Stripe from 'stripe';
import StripeSdk from 'stripe';
import { Router, type Request, type Response } from 'express';
import { getStripeEnv } from '@/utils/stripe-env';
import { getStripeOrThrow } from './stripe-client';
import { messageForStripeCheckoutOrPortalError } from './stripe-invalid-request-message';
import { toTenantIdString } from '@shared/to-tenant-id-string';
import { scheduleRecordUserEvent } from '@/api/analytics/record-request-event';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

/** All active prices (paginated) so nothing is silently omitted after the first page. */
async function listAllActivePrices(stripe: Stripe): Promise<Stripe.Price[]> {
  const all: Stripe.Price[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.prices.list({
      active: true,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    all.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    const last = page.data.at(-1);
    if (!last?.id) break;
    startingAfter = last.id;
  }
  return all;
}

function stripeKeyMode(secretKey: string): 'live' | 'test' {
  if (secretKey.startsWith('sk_live') || secretKey.startsWith('rk_live')) return 'live';
  return 'test';
}

router.get('/prices', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const env = getStripeEnv();
    if (!env) {
      res.status(503).json({ error: 'Billing is not configured' });
      return;
    }
    const stripe = getStripeOrThrow();
    const rows = await listAllActivePrices(stripe);
    const prices = rows.map(p => ({
      id: p.id,
      nickname: p.nickname ?? null,
      unitAmount: p.unit_amount,
      currency: p.currency,
      recurringInterval: p.recurring?.interval ?? null,
    }));
    const apiMode = stripeKeyMode(env.secretKey);
    res.json({ prices, apiMode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list prices' });
  }
});

router.post(
  '/checkout-session',
  requireAppRole(APP_ROLE.USER),
  async (req: Request, res: Response) => {
    try {
      const env = getStripeEnv();
      if (!env) {
        res.status(503).json({ error: 'Billing is not configured' });
        return;
      }
      const user = req.ctx?.user;
      if (!user?.tenantId || !user.email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const stripe = getStripeOrThrow();
      const customerId = user.tenant?.stripeCustomerId;
      const tenantIdStr = toTenantIdString(user.tenantId);
      if (!tenantIdStr.length) {
        res.status(400).json({ error: 'Invalid tenant' });
        return;
      }

      const tenantPrice = user.tenant?.stripePriceId?.trim();
      const priceId = tenantPrice && tenantPrice.length > 0 ? tenantPrice : null;
      if (!priceId) {
        res.status(400).json({
          error: 'No checkout price configured. Set this tenant’s Stripe price (global admin).',
        });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        ...(customerId ? { customer: customerId } : { customer_email: user.email }),
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${env.clientOrigin}/dashboard/settings/billing?checkout=success`,
        cancel_url: `${env.clientOrigin}/dashboard/settings/billing?checkout=canceled`,
        metadata: { tenantId: tenantIdStr },
        subscription_data: {
          metadata: { tenantId: tenantIdStr },
        },
      });
      if (!session.url) {
        res.status(500).json({ error: 'No checkout URL' });
        return;
      }
      scheduleRecordUserEvent(req, 'billing.checkout_session', { category: 'billing' });
      res.json({ url: session.url });
    } catch (e) {
      console.error(e);
      if (e instanceof StripeSdk.errors.StripeInvalidRequestError) {
        const { status, message } = messageForStripeCheckoutOrPortalError(
          e,
          'Could not start checkout'
        );
        res.status(status).json({ error: message });
        return;
      }
      res.status(500).json({ error: 'Could not start checkout' });
    }
  }
);

router.post(
  '/billing-portal',
  requireAppRole(APP_ROLE.USER),
  async (req: Request, res: Response) => {
    try {
      const env = getStripeEnv();
      if (!env) {
        res.status(503).json({ error: 'Billing is not configured' });
        return;
      }
      const user = req.ctx?.user;
      if (!user?.tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const customerId = user.tenant?.stripeCustomerId;
      if (!customerId) {
        res.status(400).json({
          error: 'No Stripe customer yet. Complete checkout first.',
        });
        return;
      }
      const stripe = getStripeOrThrow();
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${env.clientOrigin}/dashboard/settings/billing`,
      });
      if (!session.url) {
        res.status(500).json({ error: 'No portal URL' });
        return;
      }
      scheduleRecordUserEvent(req, 'billing.portal_open', { category: 'billing' });
      res.json({ url: session.url });
    } catch (e) {
      console.error(e);
      if (e instanceof StripeSdk.errors.StripeInvalidRequestError) {
        const { status, message } = messageForStripeCheckoutOrPortalError(
          e,
          'Could not open billing portal'
        );
        res.status(status).json({ error: message });
        return;
      }
      res.status(500).json({ error: 'Could not open billing portal' });
    }
  }
);

export default router;
