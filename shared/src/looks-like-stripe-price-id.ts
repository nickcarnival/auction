/**
 * Loose guard for pasted ids (e.g. in admin UI). Authoritative validation is
 * {@link https://stripe.com/docs/api/prices/retrieve Stripe prices.retrieve}.
 */
export function looksLikeStripePriceId(value: string): boolean {
  const t = value.trim();
  return t.startsWith('price_') && t.length >= 8;
}
