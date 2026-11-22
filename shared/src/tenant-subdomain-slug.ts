import { z } from 'zod';

/** Host labels used by the app or infrastructure; not valid tenant booking slugs. */
export const RESERVED_TENANT_SUBDOMAIN_SLUGS = new Set([
  'www',
  'localhost',
  'api',
  'app',
  'mail',
  'ftp',
  'cdn',
  'staging',
]);

/**
 * Normalizes user input into a DNS-style host label (lowercase, hyphens, no leading/trailing hyphen).
 */
export function normalizeTenantSubdomainSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validates the public booking hostname prefix (`slug.plandry.org`, `slug.localhost`).
 */
export const tenantSubdomainSlugSchema = z
  .string()
  .min(2, { message: 'Slug must be at least 2 characters.' })
  .max(63, { message: 'Slug must be at most 63 characters.' })
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Use lowercase letters, numbers, and single hyphens between segments (no leading or trailing hyphen).',
  })
  .refine(s => !RESERVED_TENANT_SUBDOMAIN_SLUGS.has(s), {
    message: 'This slug is reserved.',
  });
