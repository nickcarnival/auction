import { SettingsPageLayout } from '../components/settings-page-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/pages/auth/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL } from '@/utils/environment-util';
import { Tenant } from '@shared/tenant';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerReminderEmailsSection } from '../components/customer-reminder-emails-section';

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });
      return await response.json();
    },
    enabled: !!tenantId,
  });

  return (
    <SettingsPageLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bell className="size-5 shrink-0" aria-hidden />
            Notifications
          </CardTitle>
          <CardDescription>
            Email customers from the schedule and manage what Plandry can send on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p className="mb-6">
            Staff-facing alerts (for example new requests) can be expanded here later. Customer
            reminder emails are described below.
          </p>
        </CardContent>
      </Card>

      {isLoading || !tenant ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : (
        <>
          <CustomerReminderEmailsSection
            watchedName={tenant.name ?? ''}
            watchedPhone={tenant.phone ?? ''}
            watchedEmail={tenant.email ?? ''}
          />
          <p className="text-sm text-muted-foreground">
            To change the business name, phone, or email used in these messages, edit{' '}
            <Link
              to="/dashboard/settings/operations"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Business profile
            </Link>{' '}
            under Operations.
          </p>
        </>
      )}
    </SettingsPageLayout>
  );
}
