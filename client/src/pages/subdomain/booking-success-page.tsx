import { Button } from '@/components/ui/button';
import { resolveBusinessWebsiteUrl } from '@/utils/resolve-business-website-url';
import { getTenantDisplayTitle } from '@shared/tenant';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { TenantLayout } from './tenant-layout';
import { useSubdomainContext } from './subdomain-provider';

const REDIRECT_DELAY_MS = 10_000;

export type BookingSuccessLocationState = {
  redirectUrl?: string;
  /** True when the customer entered an email on the form (server sends confirmation when valid). */
  hadEmail?: boolean;
};

export function BookingSuccessPage() {
  const { subdomainContext, subDomain, isLoading } = useSubdomainContext();
  const location = useLocation();
  const state = location.state as BookingSuccessLocationState | null;
  const rawRedirectUrl = state?.redirectUrl?.trim();
  const redirectUrl = useMemo(
    () => resolveBusinessWebsiteUrl(rawRedirectUrl),
    [rawRedirectUrl]
  );
  const hadEmail = Boolean(state?.hadEmail);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(REDIRECT_DELAY_MS / 1000));

  const businessTitle = subdomainContext
    ? getTenantDisplayTitle(subdomainContext.tenant, subdomainContext.tenantCode, subDomain)
    : '';

  useEffect(() => {
    if (!redirectUrl) return;
    const deadline = Date.now() + REDIRECT_DELAY_MS;
    const intervalId = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    const timeoutId = window.setTimeout(() => {
      window.location.replace(redirectUrl);
    }, REDIRECT_DELAY_MS);
    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [redirectUrl]);

  if (isLoading || !subdomainContext) {
    return (
      <div className="flex min-h-dvh w-full flex-col overflow-x-hidden">
        <TenantLayout>
          <div className="text-muted-foreground w-full py-12 text-center">Loading…</div>
        </TenantLayout>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden">
      <TenantLayout>
        <div className="flex w-full flex-col items-center gap-4 px-4 py-10 text-center">
        <CheckCircle2 className="text-primary h-14 w-14 shrink-0" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">We received your request</h1>
        <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
          {businessTitle ? (
            <>
              {businessTitle} has your details and will review them.
              {hadEmail
                ? ' We also sent a copy of this summary to your email.'
                : ' They’ll follow up using the contact information you shared.'}
            </>
          ) : (
            <>
              Your request was sent successfully.
              {hadEmail
                ? ' We also emailed a short summary to the address you provided.'
                : ' The shop will follow up using the contact details you shared.'}
            </>
          )}
        </p>
        <p className="text-muted-foreground max-w-md text-xs leading-relaxed">
          Nothing is scheduled until the shop contacts you and confirms a time.
        </p>
        {redirectUrl ? (
          <p className="text-muted-foreground max-w-md text-sm">
            {secondsLeft > 0 ? (
              <>Taking you to the business website in {secondsLeft}s…</>
            ) : (
              <>Redirecting…</>
            )}
          </p>
        ) : null}
        {redirectUrl ? (
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => {
              window.location.assign(redirectUrl);
            }}
          >
            Continue to website now
          </Button>
        ) : null}
        </div>
      </TenantLayout>
    </div>
  );
}
