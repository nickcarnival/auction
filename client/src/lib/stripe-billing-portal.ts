import { BASE_URL } from '@/utils/environment-util';
import { readResponseErrorMessage } from '@shared/read-response-error-message';

export async function openStripeBillingPortal(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/stripe/billing-portal`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(await readResponseErrorMessage(res, 'Could not open billing portal'));
  }
  const data = (await res.json()) as { url?: string };
  if (data.url) {
    window.location.href = data.url;
  }
}
