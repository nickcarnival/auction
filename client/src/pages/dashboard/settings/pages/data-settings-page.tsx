import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { SettingsPageLayout } from '../components/settings-page-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BASE_URL, HOME_URL } from '@/utils/environment-util';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { Download, LifeBuoy, ListChecks } from 'lucide-react';

async function downloadCsv(apiPath: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${apiPath}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(await readResponseErrorMessage(res, 'Download failed'));
  }
  const cd = res.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  const match = cd?.match(/filename="([^"]+)"/);
  if (match?.[1]) {
    filename = match[1];
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DataSettingsPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'customers' | 'appointments' | null>(null);

  const onExportCustomers = useCallback(async () => {
    setError(null);
    setBusy('customers');
    try {
      await downloadCsv('/api/export/customers.csv', 'plandry-customers.csv');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  }, []);

  const onExportAppointments = useCallback(async () => {
    setError(null);
    setBusy('appointments');
    try {
      await downloadCsv('/api/export/appointments.csv', 'plandry-appointments.csv');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(null);
    }
  }, []);

  const contactHref = `${HOME_URL}/contact`;

  return (
    <SettingsPageLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Download className="size-5 shrink-0" aria-hidden />
              Export your data
            </CardTitle>
            <CardDescription>
              Download CSV files of active customers and appointments for this tenant. Files use
              UTF-8 (Excel-friendly with a BOM).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void onExportCustomers()}
            >
              {busy === 'customers' ? 'Preparing…' : 'Download customers (CSV)'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void onExportAppointments()}
            >
              {busy === 'appointments' ? 'Preparing…' : 'Download appointments (CSV)'}
            </Button>
          </CardContent>
          {error ? (
            <CardFooter>
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            </CardFooter>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ListChecks className="size-5 shrink-0" aria-hidden />
              Getting started
            </CardTitle>
            <CardDescription>Quick path to a usable calendar and public booking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Under{' '}
                <Link
                  to="/dashboard/settings/operations"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Operations
                </Link>
                , set shop hours and your business profile; under{' '}
                <Link
                  to="/dashboard/settings/business"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Booking page
                </Link>
                , preview your public request page.
              </li>
              <li>
                Add technicians under{' '}
                <Link
                  to="/dashboard/technicians"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Team
                </Link>
                .
              </li>
              <li>
                Share your public booking link from Booking page settings so customers can send
                requests.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <LifeBuoy className="size-5 shrink-0" aria-hidden />
              Help & account
            </CardTitle>
            <CardDescription>Questions, billing issues, or data deletion requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visit{' '}
              <a
                href={contactHref}
                className="font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Contact & support
              </a>{' '}
              (opens in a new tab).
            </p>
          </CardContent>
        </Card>
      </div>
    </SettingsPageLayout>
  );
}
