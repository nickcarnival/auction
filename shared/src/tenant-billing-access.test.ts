import { describe, it, expect } from 'vitest';
import {
  isAppTrialExpiredWithoutSubscription,
  tenantHasBillingAccess,
  tenantHasStripeEntitlement,
  isWithinAppTrialPeriod,
} from './tenant';

const futureIso = new Date(Date.now() + 7 * 864e5).toISOString();
const pastIso = new Date(Date.now() - 7 * 864e5).toISOString();

describe('isWithinAppTrialPeriod', () => {
  it('is true before trialEndsAt', () => {
    expect(isWithinAppTrialPeriod({ trialEndsAt: futureIso })).toBe(true);
  });

  it('is false after trialEndsAt', () => {
    expect(isWithinAppTrialPeriod({ trialEndsAt: pastIso })).toBe(false);
  });

  it('is false when missing', () => {
    expect(isWithinAppTrialPeriod({})).toBe(false);
    expect(isWithinAppTrialPeriod(null)).toBe(false);
  });
});

describe('tenantHasBillingAccess', () => {
  it('allows grandfathered tenants with no Stripe snapshot', () => {
    expect(tenantHasBillingAccess({})).toBe(true);
    expect(
      tenantHasBillingAccess({
        stripeCustomerId: undefined,
        subscriptionStatus: undefined,
      })
    ).toBe(true);
  });

  it('denies null tenant', () => {
    expect(tenantHasBillingAccess(null)).toBe(false);
    expect(tenantHasBillingAccess(undefined)).toBe(false);
  });

  it('allows when billingExempt is true even with bad subscription', () => {
    expect(
      tenantHasBillingAccess({
        billingExempt: true,
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'canceled',
      })
    ).toBe(true);
  });

  it('requires active, trialing, or past_due (grace) when Stripe fields exist', () => {
    expect(
      tenantHasBillingAccess({
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'active',
      })
    ).toBe(true);
    expect(
      tenantHasBillingAccess({
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'trialing',
      })
    ).toBe(true);
    expect(
      tenantHasBillingAccess({
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'past_due',
      })
    ).toBe(true);
    expect(
      tenantHasBillingAccess({
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'canceled',
      })
    ).toBe(false);
    expect(
      tenantHasBillingAccess({
        subscriptionStatus: 'unpaid',
        stripeCustomerId: 'cus_x',
      })
    ).toBe(false);
  });

  it('denies canceled subscription when Stripe snapshot exists (no trialEndsAt)', () => {
    expect(
      tenantHasBillingAccess({
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'canceled',
      })
    ).toBe(false);
  });

  it('treats subscriptionStatus alone as Stripe snapshot for grandfather gate', () => {
    expect(
      tenantHasBillingAccess({
        subscriptionStatus: 'canceled',
      })
    ).toBe(false);
  });

  it('allows app trial window without Stripe before trialEndsAt', () => {
    expect(
      tenantHasBillingAccess({
        trialEndsAt: futureIso,
      })
    ).toBe(true);
  });

  it('denies after trialEndsAt without good Stripe status', () => {
    expect(
      tenantHasBillingAccess({
        trialEndsAt: pastIso,
      })
    ).toBe(false);
  });

  it('allows after trialEndsAt when Stripe is in good standing', () => {
    expect(
      tenantHasBillingAccess({
        trialEndsAt: pastIso,
        stripeCustomerId: 'cus_x',
        subscriptionStatus: 'active',
      })
    ).toBe(true);
  });
});

describe('isAppTrialExpiredWithoutSubscription', () => {
  it('is true when trial ended and no Stripe entitlement', () => {
    expect(
      isAppTrialExpiredWithoutSubscription({
        trialEndsAt: pastIso,
        subscriptionStatus: undefined,
      })
    ).toBe(true);
    expect(
      isAppTrialExpiredWithoutSubscription({
        trialEndsAt: pastIso,
        subscriptionStatus: 'unpaid',
      })
    ).toBe(true);
  });

  it('is false when trial still active or no trial end set', () => {
    expect(
      isAppTrialExpiredWithoutSubscription({
        trialEndsAt: futureIso,
      })
    ).toBe(false);
    expect(isAppTrialExpiredWithoutSubscription({})).toBe(false);
  });

  it('is false when Stripe is in good standing', () => {
    expect(
      isAppTrialExpiredWithoutSubscription({
        trialEndsAt: pastIso,
        subscriptionStatus: 'active',
      })
    ).toBe(false);
  });
});

describe('tenantHasStripeEntitlement', () => {
  it('is true for active, trialing, and past_due (fix payment in portal)', () => {
    expect(tenantHasStripeEntitlement({ subscriptionStatus: 'active' })).toBe(true);
    expect(tenantHasStripeEntitlement({ subscriptionStatus: 'trialing' })).toBe(true);
    expect(tenantHasStripeEntitlement({ subscriptionStatus: 'past_due' })).toBe(true);
    expect(tenantHasStripeEntitlement({ subscriptionStatus: 'canceled' })).toBe(false);
    expect(tenantHasStripeEntitlement({ subscriptionStatus: 'unpaid' })).toBe(false);
    expect(tenantHasStripeEntitlement({})).toBe(false);
  });
});
