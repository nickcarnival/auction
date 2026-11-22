import Stripe from 'stripe';

/** Stripe returns this when `price_…` is from test data but the key is live (or vice versa). */
const MODE_MISMATCH =
  'Test/live mismatch: this tenant’s Stripe Price id and your secret key must be from the same Dashboard mode (test with test, live with live).';

const UNKNOWN_PRICE =
  'Stripe could not find this Price id. Check the tenant’s Stripe price in global admin—same account and mode (test vs live) as your secret key.';

/**
 * Maps Stripe API errors to a safe user-facing string for checkout / portal routes.
 */
export function messageForStripeCheckoutOrPortalError(
  err: unknown,
  fallback: string
): { status: number; message: string } {
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    const raw = err.message ?? '';
    if (err.code === 'resource_missing') {
      if (/test mode.*live mode|live mode.*test mode/i.test(raw)) {
        return { status: 400, message: MODE_MISMATCH };
      }
      if (err.param?.includes('price') || raw.toLowerCase().includes('no such price')) {
        return { status: 400, message: UNKNOWN_PRICE };
      }
    }
  }
  return { status: 500, message: fallback };
}
