import { Router, type Request, type Response } from 'express';
import type Stripe from 'stripe';
import { getStripeEnv } from '@/utils/stripe-env';
import { getStripeOrThrow } from './stripe-client';
import { processStripeWebhookEvent } from './stripe-webhook-processor';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const env = getStripeEnv();
  if (!env) {
    res.status(503).send('Billing not configured');
    return;
  }
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).send('Missing stripe-signature');
    return;
  }
  let event: Stripe.Event;
  try {
    const stripe = getStripeOrThrow();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.webhookSecret);
  } catch (err) {
    console.error('[stripe] webhook signature', err);
    res.status(400).send('Invalid signature');
    return;
  }
  try {
    const stripe = getStripeOrThrow();
    await processStripeWebhookEvent(event, stripe);
  } catch (e) {
    console.error('[stripe] webhook handler', e);
    res.status(500).json({ error: 'Webhook handler failed' });
    return;
  }
  res.json({ received: true });
});

export default router;
