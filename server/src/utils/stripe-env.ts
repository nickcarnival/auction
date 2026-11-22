import { getClientAppOrigin } from '@/utils/client-app-origin';

/**
 * Stripe Billing env. `getStripeEnv()` is null until secret + webhook secret exist.
 */
export type StripeEnv = {
  secretKey: string;
  webhookSecret: string;
  /** Browser origin for Checkout success/cancel and Customer Portal return (e.g. https://app.example.com). */
  clientOrigin: string;
};

export function getStripeEnv(): StripeEnv | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const clientOrigin = getClientAppOrigin();

  if (!secretKey || !webhookSecret) {
    return null;
  }

  return { secretKey, webhookSecret, clientOrigin };
}
