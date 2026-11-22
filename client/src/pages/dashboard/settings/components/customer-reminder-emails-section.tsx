import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildReminderEmailHtml,
  buildReminderEmailSubject,
  getReminderTenantBlockers,
  REMINDER_PREVIEW_PLACEHOLDER_PHONE,
  REMINDER_PREVIEW_PLACEHOLDER_SHOP,
  REMINDER_PREVIEW_SAMPLE_CUSTOMER_NAME,
  REMINDER_TENANT_FIELD_LABELS,
} from '@shared/customer-reminder';
import { CustomerReminderEmailPreview } from './customer-reminder-email-preview';

type CustomerReminderEmailsSectionProps = {
  watchedName: string;
  watchedPhone: string;
  watchedEmail: string;
};

export function CustomerReminderEmailsSection({
  watchedName,
  watchedPhone,
  watchedEmail,
}: CustomerReminderEmailsSectionProps) {
  const bodyHtml = useMemo(
    () =>
      buildReminderEmailHtml({
        shopName: (watchedName || '').trim() || REMINDER_PREVIEW_PLACEHOLDER_SHOP,
        customerName: REMINDER_PREVIEW_SAMPLE_CUSTOMER_NAME,
        dropOffLabel: new Date().toLocaleString(),
        shopPhone: (watchedPhone || '').trim() || REMINDER_PREVIEW_PLACEHOLDER_PHONE,
      }),
    [watchedName, watchedPhone]
  );

  const subject = useMemo(
    () =>
      buildReminderEmailSubject((watchedName || '').trim() || REMINDER_PREVIEW_PLACEHOLDER_SHOP),
    [watchedName]
  );

  const reminderBlockers = useMemo(
    () =>
      getReminderTenantBlockers({
        name: watchedName,
        phone: watchedPhone,
        email: watchedEmail,
      }),
    [watchedName, watchedPhone, watchedEmail]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer reminder emails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          When you use <span className="font-medium text-foreground">Remind</span> on an
          appointment, Plandry sends one email to the customer&apos;s address on that appointment.
          The message uses your business name and phone from your{' '}
          <span className="font-medium text-foreground">business profile</span> (Operations). Your
          business email must be saved there so that reminders can be sent.
        </p>
        {reminderBlockers.length > 0 ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            <p className="font-medium text-destructive">
              Complete these fields to enable reminders:
            </p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {reminderBlockers.map(key => (
                <li key={key}>{REMINDER_TENANT_FIELD_LABELS[key]}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm font-medium text-success-subtle-foreground">
            Business details needed for reminders are filled in.
          </p>
        )}
        <div>
          <p className="mb-2 text-sm font-medium">Inbox preview (sample customer &amp; time)</p>
          <CustomerReminderEmailPreview subject={subject} bodyHtml={bodyHtml} />
        </div>
      </CardContent>
    </Card>
  );
}
