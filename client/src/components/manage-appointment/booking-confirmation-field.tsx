import {
  FormControl,
  FormField,
  FormItem,
  InfoFormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { YesNoSegment } from '@/components/ui/yes-no-segment';
import { HookFormType } from '@shared/schemas/appointment-schema';
import { REQUEST_DETAIL_SEARCH_PARAM } from '@/hooks/notification-context';
import { useAppointmentContext } from '@/components/schedule/appointment-context';
import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { appointmentFieldIcons } from './appointment-display-icons';

type BookingConfirmationFieldProps = HookFormType;

export const BookingConfirmationField = ({ form }: BookingConfirmationFieldProps) => {
  const { setCurrentAppointment } = useAppointmentContext();
  const bookingRequestId = form.watch('bookingRequestId')?.trim() ?? '';

  return (
    <FormField
      control={form.control}
      name="isConfirmed"
      render={({ field: { onChange, value } }) => {
        const confirmed = Boolean(value);

        const requestInboxHref =
          bookingRequestId === ''
            ? null
            : `/dashboard/requests?${new URLSearchParams({
                [REQUEST_DETAIL_SEARCH_PARAM]: bookingRequestId,
                ...(confirmed ? { queue: 'confirmed' } : {}),
              }).toString()}`;

        return (
          <FormItem className="flex w-full flex-col gap-2 space-y-0">
            <InfoFormLabel
              className="w-full"
              fieldName="Appointment confirmed"
              info="Whether this time is confirmed with the customer. For appointments from a booking request, a link may appear below to open that thread in Requests."
            >
              Appointment Confirmed
            </InfoFormLabel>
            <FormControl>
              <div className="flex flex-col gap-2">
                <YesNoSegment
                  value={confirmed}
                  onChange={onChange}
                  aria-label="Appointment confirmed"
                  icons={{
                    yes: appointmentFieldIcons.bookingConfirmedYes,
                    no: appointmentFieldIcons.bookingConfirmedNo,
                  }}
                />
                {requestInboxHref ? (
                  <Link
                    to={requestInboxHref}
                    onClick={() => setCurrentAppointment(null)}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                    Open linked booking request
                  </Link>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
