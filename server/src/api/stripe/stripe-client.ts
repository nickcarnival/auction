import Stripe from 'stripe';
import { getStripeEnv } from '@/utils/stripe-env';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const env = getStripeEnv();
  if (!env) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(env.secretKey);
  }
  return stripeSingleton;
}

export function getStripeOrThrow(): Stripe {
  const client = getStripe();
  if (!client) {
    throw new Error('Stripe is not configured (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)');
  }
  return client;
}
