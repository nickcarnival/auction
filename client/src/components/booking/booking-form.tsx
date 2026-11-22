import { useSubdomainContext } from '@/pages/subdomain/subdomain-provider';
import ReCAPTCHA from 'react-google-recaptcha';
import { bookingSchema, BookingSchemaType } from '@shared/schemas/booking-schema';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { Form } from '../ui/form/form';
import { BASE_URL } from '@/utils/environment-util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Skeleton } from '../ui/skeleton';
import { BookingField } from './booking-field';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router';
import { DateFormField } from '../ui/form/date-form-field';
import { MotorcycleField } from '@/components/ui/form/motorcycle-field';
import { PhoneField } from '@/components/ui/form/phone-field';
import { useCaptcha } from './use-captcha';
import { GenericField } from '../ui/form/generic-field';
import { BOOKING_RETURN_VISITOR_STORAGE_VERSION } from '@shared/booking-return-visitor';
import { normalizeCustomerNameWhileTyping } from '@shared/customer-name-utils';
import { BOOKING_FORM_AUTOCOMPLETE } from './booking-form-autocomplete';
import {
  extractInsertedIdFromBookingCreateResponse,
  readBookingReturnVisitor,
  writeBookingReturnVisitor,
} from '@/lib/booking-return-visitor-storage';
import { invalidateBookingQueueCounts } from '@/lib/invalidate-booking-queue-counts';
import { useEffect } from 'react';

export const BookingForm = () => {
  const { subdomainContext, isLoading } = useSubdomainContext();

  const { valid, onVerifyChange, SITE_KEY } = useCaptcha();

  const defaultValues: BookingSchemaType = {
    end: new Date(),
    start: new Date(),
    service: '',
    name: '',
    phone: '',
    email: '',
    vehicle: '',
    model: '',
    comments: '',
    year: new Date().getFullYear(),
    tenantId: subdomainContext?.tenantId ?? '',
  };

  const form = useForm<BookingSchemaType>({
    resolver: zodResolver(bookingSchema),
    defaultValues,
  });

  const tenantId = subdomainContext?.tenantId ?? '';

  useEffect(() => {
    if (!tenantId || isLoading) return;
    const saved = readBookingReturnVisitor(tenantId);
    form.reset({
      end: new Date(),
      start: new Date(),
      service: '',
      name: saved?.name ?? '',
      phone: saved?.phone ?? '',
      email: saved?.email ?? '',
      vehicle: saved?.vehicle ?? '',
      model: '',
      comments: '',
      year: new Date().getFullYear(),
      tenantId,
    });
  }, [tenantId, isLoading, form]);

  const queryClient = useQueryClient();

  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async (vals: BookingSchemaType) => {
      const response = await fetch(`${BASE_URL}/api/booking-request/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...vals }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Could not submit booking request')
        );
      }
      return response.json();
    },
    onSuccess: async (data, variables) => {
      const bookingRequestId = extractInsertedIdFromBookingCreateResponse(data);
      const tid = subdomainContext?.tenantId;
      if (bookingRequestId && tid) {
        writeBookingReturnVisitor({
          v: BOOKING_RETURN_VISITOR_STORAGE_VERSION,
          tenantId: tid,
          bookingRequestId,
          name: typeof variables.name === 'string' ? variables.name.trim() : '',
          email: typeof variables.email === 'string' ? variables.email.trim() : '',
          phone: typeof variables.phone === 'string' ? variables.phone.trim() : '',
          vehicle: typeof variables.vehicle === 'string' ? variables.vehicle.trim() : '',
          savedAt: new Date().toISOString(),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      invalidateBookingQueueCounts(queryClient);
      navigate('/success', {
        state: {
          redirectUrl: subdomainContext?.redirectUrl?.trim() || undefined,
          hadEmail: Boolean(variables.email?.trim()),
        },
      });
    },
  });

  const onSubmit = (values: BookingSchemaType) => {
    if (mutation.isPending) return;
    mutation.mutate(values);
  };

  if (isLoading || !subdomainContext) {
    return (
      <div className="w-full flex justify-center items-center h-full">
        <Skeleton className="w-3/4 h-2/3" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        id="booking-request-form"
        name="booking-request"
        autoComplete="on"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col items-center bg-inherit p-2 shadow-lg"
      >
        <div className="grid gap-1 grid-cols-1 md:gap-2 md:grid-cols-2 w-full">
          <GenericField
            name="name"
            label="Name"
            placeholder="Jane Smith"
            form={form}
            autoComplete={BOOKING_FORM_AUTOCOMPLETE.name}
            transformOnChange={normalizeCustomerNameWhileTyping}
          />

          <GenericField
            name="email"
            label="Email"
            placeholder="johnsmith@mail.com"
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
            dark
            label="Preferred Dropoff Date"
            name="start"
            form={form}
          />

          <DateFormField<BookingSchemaType>
            dark
            label="Preferred Pickup Date"
            name="end"
            form={form}
          />
        </div>

        <BookingField
          name="comments"
          form={form}
          label="Job Description"
          type="textarea"
          placeholder="What services are you looking for / how can we help you?"
          autoComplete={BOOKING_FORM_AUTOCOMPLETE.comments}
        />

        <div className="w-full flex justify-center items-center mt-6">
          {valid ? (
            <Button
              type="submit"
              variant="solid"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Submitting…' : 'Request Service'}
            </Button>
          ) : (
            <ReCAPTCHA sitekey={SITE_KEY} onChange={onVerifyChange} className="w-full" />
          )}
        </div>
      </form>
    </Form>
  );
};
