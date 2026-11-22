import { BASE_URL } from '@/utils/environment-util';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

export async function startStripeCheckout(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/stripe/checkout-session`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(await readResponseErrorMessage(res, 'Checkout failed'));
  }
  const data = (await res.json()) as { url?: string };
  if (data.url) {
    window.location.href = data.url;
  }
}
