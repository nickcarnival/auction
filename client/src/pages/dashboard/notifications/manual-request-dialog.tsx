import { BookingField } from '@/components/booking/booking-field';
import { BOOKING_FORM_AUTOCOMPLETE } from '@/components/booking/booking-form-autocomplete';
import { PhoneField } from '@/components/ui/form/phone-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form/form';
import { DateFormField } from '@/components/ui/form/date-form-field';
import { MotorcycleField } from '@/components/ui/form/motorcycle-field';
import { CustomerField } from '@/components/manage-appointment/customer-field';
import { GenericField } from '@/components/ui/form/generic-field';
import { BASE_URL } from '@/utils/environment-util';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { useAuth } from '@/pages/auth/auth-provider';
import { bookingSchema, BookingSchemaType } from '@shared/schemas/booking-schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardPlus, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { APP_ROLE } from '@shared/app-rbac';
import { invalidateBookingQueueCounts } from '@/lib/invalidate-booking-queue-counts';

/** Roles that see the dev “random fill & submit” shortcut (must match server / nav checks). */
const BOOKING_REQUEST_DEV_AUTOFILL_ROLES = new Set([APP_ROLE.ADMIN]);

function randomDigitString(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

/**
 * Valid random payload for local / QA testing (passes `bookingSchema` + booking-request API).
 * No `customerId`: “new” contact only — server `conditionalCreateCustomer` (same create-or-resolve
 * idea as when an appointment is saved without choosing a directory row).
 */
function generateDevBookingRequest(tenantId: string): BookingSchemaType {
  const now = new Date();
  const suffix = randomDigitString(6);
  const start = new Date(now);
  start.setDate(start.getDate() + 1 + Math.floor(Math.random() * 14));
  const end = new Date(start);
  end.setDate(end.getDate() + 1 + Math.floor(Math.random() * 5));
  const yearMin = 2000;
  const yearMax = now.getFullYear() + 1;
  const year = yearMin + Math.floor(Math.random() * (yearMax - yearMin + 1));

  return {
    tenantId,
    customerId: undefined,
    name: `QA Rider ${suffix}`,
    email: `qa.${suffix}@example.com`,
    phone: `303-${randomDigitString(3)}-${randomDigitString(4)}`,
    vehicle: `${year} Synthetic ${suffix} HOG`,
    model: '',
    service: 'Synthetic test — manual dev fill',
    comments: `Auto-generated • ${now.toISOString()}`,
    year,
    start,
    end,
  };
}

/**
 * Same customer model as a fresh appointment in `AppointmentModal`: either pick a
 * saved customer (then `CustomerField` sets `customerId`) or type contact info and
 * let the request API create/resolve a customer. `customerId: undefined` means no
 * directory row selected yet, not a special sentinel beyond that.
 */
function defaultFormValues(tenantId: string): BookingSchemaType {
  const now = new Date();
  return {
    end: now,
    start: now,
    service: '',
    name: '',
    customerId: undefined,
    phone: '',
    email: '',
    vehicle: '',
    model: '',
    comments: '',
    year: now.getFullYear(),
    tenantId,
  };
}

async function postManualBookingRequest(vals: BookingSchemaType): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/booking-request/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...vals }),
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await readResponseErrorMessage(response, 'Could not create booking request'));
  }
}

export function ManualRequestDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const tenantId = user?.tenantId ?? '';
  const canDevAutofill =
    user?.role !== undefined && BOOKING_REQUEST_DEV_AUTOFILL_ROLES.has(user.role);

  const form = useForm<BookingSchemaType>({
    resolver: zodResolver(bookingSchema),
    defaultValues: defaultFormValues(tenantId),
  });

  const { reset, handleSubmit } = form;

  useEffect(() => {
    if (open && tenantId) {
      reset(defaultFormValues(tenantId));
    }
  }, [open, tenantId, reset]);

  const mutation = useMutation({
    mutationFn: postManualBookingRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      invalidateBookingQueueCounts(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['customer-booking-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        disabled={!tenantId}
        onClick={() => setOpen(true)}
      >
        <ClipboardPlus className="h-4 w-4" aria-hidden />
        New request
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) mutation.reset();
        }}
      >
        <DialogContent className="max-h-[min(90vh,40rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New request</DialogTitle>
            <DialogDescription>
              Adds a request to your inbox—the same outcome as the public booking page.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              id="manual-booking-request-form"
              name="booking-request"
              autoComplete="on"
              className="flex flex-col gap-3"
              onSubmit={handleSubmit(values => mutation.mutate(values))}
              noValidate
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CustomerField
                  className="mt-0"
                  nameFormField="name"
                  form={form}
                  onFieldHighlight={() => {
                    /* new request dialog has no field highlight */
                  }}
                  inputId="manual-booking-request-customer"
                />
                <GenericField
                  name="email"
                  label="Email"
                  placeholder="jane@example.com"
                  type="email"
                  form={form}
                  autoComplete={BOOKING_FORM_AUTOCOMPLETE.email}
                  inputMode="email"
                />
                <PhoneField
                  form={form}
                  name="phone"
                  label="Phone"
                  placeholder="303-196-6663"
                  autoComplete={BOOKING_FORM_AUTOCOMPLETE.tel}
                />
                <MotorcycleField form={form} />
                <DateFormField<BookingSchemaType>
                  label="Preferred dropoff"
                  name="start"
                  form={form}
                />
                <DateFormField<BookingSchemaType>
                  label="Preferred pickup"
                  name="end"
                  form={form}
                  labelInfo={{
                    fieldName: 'Preferred pickup',
                    info: 'Matches “Promised Date” on the shop calendar after you book this request: the customer’s pickup target and your commitment date for having the work done.',
                  }}
                />
              </div>
              <BookingField
                name="comments"
                form={form}
                label="Job description"
                type="textarea"
                placeholder="Services or notes for the customer"
                autoComplete={BOOKING_FORM_AUTOCOMPLETE.comments}
              />
              {canDevAutofill ? (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    disabled={mutation.isPending || !tenantId}
                    title="Admin only — fills the form with random valid data and submits."
                    onClick={() => {
                      const vals = generateDevBookingRequest(tenantId);
                      reset(vals);
                      mutation.mutate(vals);
                    }}
                  >
                    <FlaskConical className="h-4 w-4" aria-hidden />
                    Random fill & submit
                  </Button>
                </div>
              ) : null}
              {mutation.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  Could not create the request. Check required fields and try again.
                </p>
              ) : null}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="solid" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving…' : 'Create request'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
