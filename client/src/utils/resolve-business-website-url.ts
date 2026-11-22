/**
 * Turns dashboard-stored “website” values into an absolute http(s) URL for links and redirects.
 * Host-only values (e.g. `example.com`) are treated as `https://…` so they don’t resolve as paths
 * on the booking subdomain.
 */
export function resolveBusinessWebsiteUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith('//')) return `https:${value}`;

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return undefined;

  return `https://${value}`;
}
