import { useLayoutEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  DEFAULT_APP_TRIAL_DAYS,
  tenantHasStripeEntitlement,
  tenantSubscriptionInGoodStanding,
  type Tenant,
} from '@shared/tenant';
import { useTenant } from '@/contexts/tenant-context';
import { useAuth } from '@/pages/auth/auth-provider';
import { isGlobalTenantAdminRole } from '@shared/global-admin-role';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { openStripeBillingPortal } from '@/lib/stripe-billing-portal';
import { startStripeCheckout } from '@/lib/stripe-checkout';
import { CheckCircle2, CreditCard, Info, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type CheckoutFlash = 'success' | 'canceled';

const CHECKOUT_FLASH_STORAGE_KEY = 'billingCheckoutFlash';

function readCheckoutFlashFromStorage(): CheckoutFlash | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(CHECKOUT_FLASH_STORAGE_KEY);
  if (raw === 'success' || raw === 'canceled') {
    sessionStorage.removeItem(CHECKOUT_FLASH_STORAGE_KEY);
    return raw;
  }
  return null;
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete (expired)',
  paused: 'Paused',
};

/** Status line: during app trial without a Stripe subscription record, avoid “no subscription” confusion. */
function displayedPlanStatusLabel(tenant: Tenant | null, inAppTrial: boolean): string {
  const status = tenant?.subscriptionStatus?.trim();
  if (status) {
    return SUBSCRIPTION_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  }
  if (inAppTrial) {
    return 'Tenant trial';
  }
  return 'No subscription on file';
}

function formatPeriodEndLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  try {
    return format(parseISO(iso), 'MMMM d, yyyy');
  } catch {
    return null;
  }
}

function formatTrialEndsLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  try {
    return format(parseISO(iso), 'MMMM d, yyyy');
  } catch {
    return null;
  }
}

function subscriptionCanceledCopy(periodEndDisplay: string | null): string {
  if (periodEndDisplay) {
    return `This subscription is canceled. The last billing period ended ${periodEndDisplay}. Use Subscribe if you need access again.`;
  }
  return 'This subscription is canceled. Use Subscribe if you need access again.';
}

function BillingCheckoutBanner({ flash }: { flash: CheckoutFlash }) {
  const isSuccess = flash === 'success';
  return (
    <Card
      className={cn(
        'border-2',
        isSuccess
          ? 'border-success/35 bg-success/5'
          : 'border-muted-foreground/25 bg-muted/40'
      )}
      role="status"
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2 pt-4">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="space-y-1">
          <CardTitle className="text-base">
            {isSuccess ? 'Checkout completed' : 'Checkout canceled'}
          </CardTitle>
          <CardDescription className="text-foreground/90">
            {isSuccess
              ? 'Thanks — your subscription is updating. If the status below has not caught up yet, wait a few seconds and refresh.'
              : 'You left checkout before paying. Nothing was charged. You can try again whenever you are ready.'}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const { tenant, isLoading, hasBillingAccess, isAppTrialActive } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  /** Survives React Strict Mode remount after payment redirect with ?checkout= */
  const [checkoutFlash, setCheckoutFlash] = useState<CheckoutFlash | null>(readCheckoutFlashFromStorage);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  useLayoutEffect(() => {
    const raw = searchParams.get('checkout');
    if (raw !== 'success' && raw !== 'canceled') {
      return undefined;
    }
    sessionStorage.setItem(CHECKOUT_FLASH_STORAGE_KEY, raw);
    setCheckoutFlash(raw);
    const next = new URLSearchParams(searchParams);
    next.delete('checkout');
    setSearchParams(next, { replace: true });
    const clearStorageTimer = window.setTimeout(() => {
      sessionStorage.removeItem(CHECKOUT_FLASH_STORAGE_KEY);
    }, 3000);
    return () => window.clearTimeout(clearStorageTimer);
  }, [searchParams, setSearchParams]);

  const entitled = tenantHasStripeEntitlement(tenant);
  const inGoodStanding = tenantSubscriptionInGoodStanding(tenant);
  const hasCustomer = Boolean(tenant?.stripeCustomerId?.trim());
  const billingComped = tenant?.billingExempt === true;
  /** Hide trial banners when Stripe already covers the tenant (e.g. after DB backfill). */
  const showTrialMarketing = !billingComped && !entitled;
  const periodEndFormatted = formatPeriodEndLabel(tenant?.subscriptionCurrentPeriodEnd);
  const isPastDue = tenant?.subscriptionStatus === 'past_due';
  const isCanceled = tenant?.subscriptionStatus === 'canceled';
  const inAppTrial = isAppTrialActive;
  const appTrialEndLabel = formatTrialEndsLabel(tenant?.trialEndsAt);
  const trialEndedLabel =
    tenant?.trialEndsAt?.trim() && !inAppTrial ? appTrialEndLabel : null;
  const accessBlocked =
    !isLoading &&
    tenant != null &&
    !isGlobalTenantAdminRole(user?.role) &&
    !hasBillingAccess;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-2">
        {accessBlocked ? (
          <Card
            className="border-2 border-destructive/40 bg-destructive/5"
            role="alert"
            aria-live="polite"
          >
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2 pt-4">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
              <div className="space-y-1">
                <CardTitle className="text-base text-destructive">Tenant access is paused</CardTitle>
                <CardDescription className="text-foreground/90">
                  Scheduling and customer tools are unavailable until this tenant has an active
                  subscription or trial. Use Subscribe or Manage billing below to fix payment or start
                  a plan.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ) : null}

        <div className="flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Plan & billing</h1>
            <p className="text-sm text-muted-foreground">
              Subscription status and billing for this tenant.
            </p>
          </div>
        </div>

        {checkoutFlash ? <BillingCheckoutBanner flash={checkoutFlash} /> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current plan</CardTitle>
            <CardDescription>
              Your subscription status for this business. One plan includes everything — subscribe
              when you are ready, or manage payment details in billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading account…</p>
            ) : (
              <>
                {billingComped ? (
                  <div className="flex gap-2 rounded-sm border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <p>
                      This tenant has complimentary access — billing is not required for this
                      account.
                    </p>
                  </div>
                ) : null}
                {showTrialMarketing && inAppTrial && appTrialEndLabel ? (
                  <div className="flex gap-2 rounded-sm border border-warning/35 bg-warning/10 p-3 text-sm text-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden />
                    <p>
                      <span className="font-medium">Trial in progress.</span> Full access until{' '}
                      {appTrialEndLabel} — add a paid plan before then to keep using the app without
                      interruption.
                    </p>
                  </div>
                ) : null}
                {appTrialEndLabel && showTrialMarketing ? (
                  <div className="rounded-md border border-border bg-card px-3 py-2.5 text-sm">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {inAppTrial ? 'Trial ends' : 'Trial ended'}
                    </div>
                    <p className="mt-1 text-base font-semibold text-foreground">{appTrialEndLabel}</p>
                    {inAppTrial ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        New tenants receive {DEFAULT_APP_TRIAL_DAYS} days from activation; this date
                        is the end of your trial.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge variant={inGoodStanding && !isPastDue ? 'default' : 'secondary'}>
                    {displayedPlanStatusLabel(tenant, inAppTrial && showTrialMarketing)}
                  </Badge>
                  {billingComped ? (
                    <Badge variant="outline" className="border-primary/35 bg-primary/10">
                      Complimentary
                    </Badge>
                  ) : null}
                  {inAppTrial && !entitled ? (
                    <Badge variant="outline" className="border-warning/40 bg-warning/10">
                      Trial
                    </Badge>
                  ) : null}
                </div>
                {periodEndFormatted && entitled && !isCanceled ? (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Current period ends</span>
                    <p className="mt-1 text-foreground">{periodEndFormatted}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Renewal billing follows your payment method on file; exact time may follow
                      the provider&apos;s schedule.
                    </p>
                  </div>
                ) : null}
                {isCanceled && periodEndFormatted ? (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Last billing period ended</span>
                    <p className="mt-1 text-foreground">{periodEndFormatted}</p>
                  </div>
                ) : null}
                <div className="flex gap-2 rounded-sm border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>
                    {billingComped
                      ? hasCustomer
                        ? 'You can still use Manage billing if a card is on file; subscription is optional for this tenant.'
                        : 'Use Subscribe (optional) to add a plan and payment method on file, then Manage billing will open your Stripe customer portal.'
                      : isPastDue
                        ? 'Your latest charge did not go through. We keep access while the provider retries payment — update your card in Manage billing to avoid interruption.'
                        : isCanceled
                          ? subscriptionCanceledCopy(periodEndFormatted)
                          : entitled && inGoodStanding
                            ? 'Your subscription is in good standing with full access to all features.'
                            : inAppTrial && appTrialEndLabel && showTrialMarketing
                              ? `No Stripe subscription is on file yet — you are covered by the tenant trial until ${appTrialEndLabel}. Use Subscribe when you are ready; you can add a plan any time before your trial ends.`
                              : hasCustomer
                                ? 'Your subscription is not active or in trial. Update payment or renew from billing when available.'
                                : trialEndedLabel
                                  ? `Your tenant trial ended on ${trialEndedLabel}. Use Subscribe to add a paid plan and restore full access.`
                                  : 'You have not completed subscription setup yet — use Subscribe below to get started.'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 bg-muted/20 px-6 py-4">
            {/* Complimentary tenants still need Subscribe to create a Stripe customer before Manage billing works. */}
            {!entitled ? (
              <Button
                type="button"
                className={cn(
                  'border-2 border-success bg-success font-semibold text-primary-foreground shadow-sm',
                  'hover:border-success hover:bg-success/90',
                  'focus-visible:ring-success/40'
                )}
                disabled={checkoutBusy || isLoading}
                onClick={() => {
                  void (async () => {
                    setCheckoutBusy(true);
                    try {
                      await startStripeCheckout();
                    } catch (e) {
                      console.error(e);
                      window.alert(
                        e instanceof Error ? e.message : 'Could not start checkout. Try again later.'
                      );
                    } finally {
                      setCheckoutBusy(false);
                    }
                  })();
                }}
              >
                {checkoutBusy
                  ? 'Redirecting…'
                  : billingComped
                    ? 'Subscribe (optional)'
                    : 'Subscribe'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={portalBusy || isLoading || !hasCustomer}
              title={!hasCustomer ? 'Complete Subscribe once so we can link your billing account.' : undefined}
              onClick={() => {
                void (async () => {
                  setPortalBusy(true);
                  try {
                    await openStripeBillingPortal();
                  } catch (e) {
                    console.error(e);
                    window.alert(
                      e instanceof Error
                        ? e.message
                        : 'Could not open billing portal. Try again later.'
                    );
                  } finally {
                    setPortalBusy(false);
                  }
                })();
              }}
            >
              {portalBusy ? 'Opening…' : 'Manage billing'}
            </Button>
          </CardFooter>
        </Card>
    </div>
  );
}
