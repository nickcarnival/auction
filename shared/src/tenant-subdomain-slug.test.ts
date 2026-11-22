import { describe, expect, it } from 'vitest';
import {
  normalizeTenantSubdomainSlug,
  tenantSubdomainSlugSchema,
  RESERVED_TENANT_SUBDOMAIN_SLUGS,
} from './tenant-subdomain-slug';

describe('normalizeTenantSubdomainSlug', () => {
  it('lowercases and replaces invalid characters with hyphens', () => {
    expect(normalizeTenantSubdomainSlug('Maurers Motors!')).toBe('maurers-motors');
  });

  it('trims hyphens at edges', () => {
    expect(normalizeTenantSubdomainSlug('-admintest-')).toBe('admintest');
  });
});

describe('tenantSubdomainSlugSchema', () => {
  it('accepts typical slugs', () => {
    expect(tenantSubdomainSlugSchema.safeParse('maurersmotors').success).toBe(true);
    expect(tenantSubdomainSlugSchema.safeParse('ad-min-test').success).toBe(true);
  });

  it('rejects reserved slugs', () => {
    expect(tenantSubdomainSlugSchema.safeParse('www').success).toBe(false);
    expect(RESERVED_TENANT_SUBDOMAIN_SLUGS.has('www')).toBe(true);
  });

  it('rejects leading hyphen after normalize would fix — schema is for normalized input', () => {
    expect(tenantSubdomainSlugSchema.safeParse('-bad').success).toBe(false);
  });
});
