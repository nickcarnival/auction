/**
 * Persists billing fields to Mongo. Requires this endpoint to receive Stripe webhook events:
 * in local dev use `stripe listen --forward-to <origin>/api/stripe/webhook` and set the webhook
 * signing secret from the CLI output in env — Checkout alone does not write tenant billing fields.
 */
import type Stripe from 'stripe';
import { updateTenantBilling, getTenantByStripeCustomerId } from '@/api/tenant/tenant-service';

async function resolveTenantId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMeta = subscription.metadata?.tenantId?.trim();
  if (fromMeta) return fromMeta;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;
  const tenant = await getTenantByStripeCustomerId(customerId);
  return tenant?._id ?? null;
}

function subscriptionPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const end = subscription.current_period_end;
  if (typeof end !== 'number' || !Number.isFinite(end)) {
    return null;
  }
  return new Date(end * 1000).toISOString();
}

async function applySubscriptionToTenant(
  tenantId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const clearLegacyTrial =
    subscription.status === 'active' ||
    subscription.status === 'trialing' ||
    subscription.status === 'past_due';
  const periodEnd = subscriptionPeriodEndIso(subscription);
  await updateTenantBilling(tenantId, {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    ...(periodEnd ? { subscriptionCurrentPeriodEnd: periodEnd } : {}),
    ...(clearLegacyTrial ? { trial: false } : {}),
  });
}

export async function processStripeWebhookEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenantId?.trim();
      if (!tenantId) {
        console.warn('[stripe] checkout.session.completed missing metadata.tenantId');
        return;
      }
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      if (customerId) {
        await updateTenantBilling(tenantId, { stripeCustomerId: customerId });
      }
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscriptionToTenant(tenantId, sub);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = await resolveTenantId(sub);
      if (!tenantId) {
        console.warn('[stripe] subscription event could not resolve tenant', sub.id);
        return;
      }
      if (event.type === 'customer.subscription.deleted' || sub.status === 'canceled') {
        const periodEnd = subscriptionPeriodEndIso(sub);
        await updateTenantBilling(tenantId, {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: 'canceled',
          trial: false,
          ...(periodEnd
            ? { subscriptionCurrentPeriodEnd: periodEnd }
            : { subscriptionCurrentPeriodEnd: null }),
        });
        return;
      }
      await applySubscriptionToTenant(tenantId, sub);
      break;
    }
    default:
      break;
  }
}
