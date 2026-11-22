import { Button } from '@/components/ui/button';
import { Pointer } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import {
  DASHBOARD_BUSINESS_SETTINGS_PATH,
  REMINDER_TENANT_FIELD_LABELS,
  getReminderTenantBlockers,
} from '@shared/customer-reminder';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useAppointmentContext } from '../schedule/appointment-context';
import { useTenant } from '@/contexts/tenant-context';
import { cn } from '@/lib/utils';

interface RemindButtonProps {
  onRemind: (appointment?: AppointmentSchemaType) => void;
  className?: string;
}

function TooltipSettingsBlurb(): ReactNode {
  return (
    <p className="mt-2 border-t border-border pt-2 text-muted-foreground">
      Your shop name and phone in this email come from{' '}
      <Link to={DASHBOARD_BUSINESS_SETTINGS_PATH} className="font-medium text-foreground underline">
        Settings → Operations
      </Link>
      . Your business email must also be saved there so reminders can be sent.
    </p>
  );
}

export function RemindButton({ onRemind, className }: RemindButtonProps) {
  const { currentAppointment } = useAppointmentContext();
  const { tenant, isLoading: tenantLoading } = useTenant();

  const tenantBlockers = useMemo(() => getReminderTenantBlockers(tenant), [tenant]);
  const tenantReady = !tenantLoading && tenantBlockers.length === 0;
  const hasCustomerEmail = Boolean(currentAppointment?.email?.trim());

  const canSend = Boolean(currentAppointment?._id && hasCustomerEmail && tenantReady && !tenantLoading);

  const reminderButtonClassName = useMemo(() => {
    if (tenantLoading) {
      return 'border-2 bg-muted border-border !cursor-not-allowed gap-1';
    }
    if (!hasCustomerEmail || !tenantReady) {
      return 'border-2 bg-muted border-border !cursor-not-allowed gap-1';
    }

    return currentAppointment?.reminded
      ? 'border-2 bg-destructive/20 border-destructive hover:bg-destructive/30 gap-1'
      : 'border-2 hover:bg-success-subtle bg-success-subtle border-success gap-1';
  }, [tenantLoading, hasCustomerEmail, tenantReady, currentAppointment?.reminded]);

  const reminderLabels = useMemo((): { short: string; long: string } => {
    if (tenantLoading) return { short: '…', long: 'Loading…' };
    if (!hasCustomerEmail) return { short: 'No email', long: 'Customer has no email' };
    if (!tenantReady) return { short: 'Setup', long: 'Complete business info' };
    if (currentAppointment?.reminded) return { short: 'Again', long: 'Remind Again' };
    return { short: 'Remind', long: 'Remind' };
  }, [tenantLoading, hasCustomerEmail, tenantReady, currentAppointment?.reminded]);

  const reminderTooltipContent = useMemo((): ReactNode => {
    if (tenantLoading) {
      return (
        <>
          <p>Loading your business settings…</p>
          <TooltipSettingsBlurb />
        </>
      );
    }

    if (!hasCustomerEmail) {
      return (
        <>
          <p>
            Reminders send an email to the customer. Add an email on this appointment to use this.
          </p>
          <TooltipSettingsBlurb />
        </>
      );
    }

    if (!tenantReady) {
      const labels = tenantBlockers.map(k => REMINDER_TENANT_FIELD_LABELS[k]).join(', ');
      return (
        <>
          <p>
            Add {labels} under{' '}
            <Link
              to={DASHBOARD_BUSINESS_SETTINGS_PATH}
              className="font-medium text-foreground underline"
            >
              Settings → Operations
            </Link>{' '}
            before reminders can be sent. The email uses your shop name and phone from that page.
          </p>
          <TooltipSettingsBlurb />
        </>
      );
    }

    const to = (
      <>
        {' '}
        <strong className="font-semibold">{currentAppointment?.email}</strong>{' '}
      </>
    );

    if (currentAppointment?.reminded) {
      return (
        <>
          <p>
            Sends another reminder email from Plandry to
            {to}
            with their drop-off time and your shop phone. Each send updates the appointment as reminded.
          </p>
          <TooltipSettingsBlurb />
        </>
      );
    }

    return (
      <>
        <p>
          Sends one email from Plandry to
          {to}
          with their drop-off time, your shop name, and phone for rescheduling or questions. Marks this
          appointment as reminded after it is sent.
        </p>
        <TooltipSettingsBlurb />
      </>
    );
  }, [
    tenantLoading,
    hasCustomerEmail,
    tenantReady,
    tenantBlockers,
    currentAppointment?.email,
    currentAppointment?.reminded,
  ]);

  if (!currentAppointment?._id) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className={cn('flex min-w-0 w-full sm:inline-flex sm:w-auto', className)}>
          <Button
            disabled={!canSend}
            className={cn(
              reminderButtonClassName,
              'h-9 w-full min-w-0 gap-1 overflow-hidden px-2 text-xs sm:w-auto sm:max-w-full md:h-10 md:gap-2 md:px-4 md:text-sm'
            )}
            variant={currentAppointment.reminded ? 'outline' : 'secondary'}
            onClick={() => onRemind(currentAppointment)}
            type="button"
          >
            <Pointer className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
            <span className="min-w-0 truncate md:hidden">{reminderLabels.short}</span>
            <span className="hidden min-w-0 truncate md:inline">{reminderLabels.long}</span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[min(20rem,calc(100vw-2rem))] break-words text-left text-xs leading-snug"
      >
        {reminderTooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
