import { useState } from 'react';
import { Navigate } from 'react-router';
import { format, parseISO } from 'date-fns';
import { pickPrimaryBusinessName } from '@shared/tenant';
import { useTenant } from '@/contexts/tenant-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Page } from '@/pages/dashboard/page';
import { startStripeCheckout } from '@/lib/stripe-checkout';
import { openStripeBillingPortal } from '@/lib/stripe-billing-portal';
import { CreditCard, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTrialEndedLabel(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  try {
    return format(parseISO(iso), 'MMMM d, yyyy');
  } catch {
    return null;
  }
}

/**
 * Full-screen subscribe prompt when the tenant app trial has ended and Stripe is not active.
 * Stripe checkout + portal still work (API routes exempt billing gate).
 */
export default function TrialExpiredPage() {
  const {
    tenant,
    isLoading,
    hasBillingAccess,
    isAppTrialExpiredWithoutSubscription,
  } = useTenant();
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const hasCustomer = Boolean(tenant?.stripeCustomerId?.trim());
  const endedLabel = formatTrialEndedLabel(tenant?.trialEndsAt);
  const businessName = pickPrimaryBusinessName(tenant);

  if (isLoading) {
    return (
      <Page>
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      </Page>
    );
  }

  if (hasBillingAccess) {
    return <Navigate to="/dashboard/schedule" replace />;
  }

  if (!isAppTrialExpiredWithoutSubscription) {
    return <Navigate to="/dashboard/settings/billing" replace />;
  }

  return (
    <Page>
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center px-3 py-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
            <Sparkles className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Your trial has ended</h1>
          {businessName ? (
            <p className="text-sm text-muted-foreground">{businessName}</p>
          ) : null}
        </div>

        <Card className="border-warning/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subscribe to keep using the app</CardTitle>
            <CardDescription className="text-foreground/90">
              {endedLabel ? (
                <>
                  Your tenant trial ended on <span className="font-medium">{endedLabel}</span>.
                  Choose a plan to restore full access to scheduling, customers, and settings.
                </>
              ) : (
                <>
                  Your tenant trial has ended. Choose a plan to restore full access to
                  scheduling, customers, and settings.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You can subscribe securely with Stripe. If you already started checkout or have a card
              on file, use Manage billing to update payment.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className={cn(
                'w-full border-2 border-success bg-success font-semibold text-primary-foreground shadow-sm sm:w-auto',
                'hover:border-success hover:bg-success/90',
                'focus-visible:ring-success/40'
              )}
              disabled={checkoutBusy}
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
              <CreditCard className="mr-2 size-4" aria-hidden />
              {checkoutBusy ? 'Redirecting…' : 'Subscribe'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={portalBusy || !hasCustomer}
              title={!hasCustomer ? 'Subscribe once to link your Stripe billing account.' : undefined}
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
    </Page>
  );
}
