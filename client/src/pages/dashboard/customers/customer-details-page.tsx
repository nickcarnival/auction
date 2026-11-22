import { useCustomerContext } from '@/components/customers/customer-context';
import { useQuery } from '@tanstack/react-query';
import { BASE_URL } from '@/utils/environment-util';
import { Suspense } from 'react';
import { CustomerBookingRequestsList } from '@/components/customers/customer-booking-requests-list';
import { CustomerProfileSection } from '@/components/customers/customer-profile-section';
import { AppointmentsList } from '@/components/customers/appointments-list';
import { CustomerMergePromptLink } from '@/components/customers/customer-merge-suggestions';
import { Skeleton } from '@/components/ui/skeleton';

function CustomerDetailsContent() {
  const { selectedCustomer, isLoadingSelectedCustomer } = useCustomerContext();

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['customer-appointments', selectedCustomer?._id],
    queryFn: async () => {
      if (!selectedCustomer?._id) return [];
      const response = await fetch(
        `${BASE_URL}/api/appointments/get-by-customer?customerId=${selectedCustomer._id}`,
        {
          credentials: 'include',
        }
      );
      return await response.json();
    },
    enabled: !!selectedCustomer?._id,
  });

  const { data: bookingRequests, isLoading: isLoadingBookingRequests } = useQuery({
    queryKey: ['customer-booking-requests', selectedCustomer?._id],
    queryFn: async () => {
      if (!selectedCustomer?._id) return [];
      const response = await fetch(
        `${BASE_URL}/api/bookings/get-by-customer?customerId=${encodeURIComponent(selectedCustomer._id)}`,
        { credentials: 'include' }
      );
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!selectedCustomer?._id,
  });

  if (isLoadingSelectedCustomer) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Skeleton className="h-[220px] w-full" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      </div>
    );
  }

  if (!selectedCustomer) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      {selectedCustomer._id ? (
        <CustomerMergePromptLink customerId={selectedCustomer._id} />
      ) : null}

      <div className="grid min-h-0 gap-4 lg:flex-1 lg:grid-cols-2 lg:items-stretch lg:overflow-hidden">
        <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-y-contain">
          <CustomerProfileSection customer={selectedCustomer} appointments={appointments} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-6 lg:overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:max-h-[45%] lg:shrink-0">
            <h2 className="shrink-0 text-lg font-semibold">Booking requests</h2>
            <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-y-contain">
              <CustomerBookingRequestsList
                requests={bookingRequests}
                isLoading={isLoadingBookingRequests}
              />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:min-h-0 lg:overflow-hidden">
            <h2 className="shrink-0 text-lg font-semibold">Appointments</h2>
            <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain">
              <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
                <AppointmentsList appointments={appointments} isLoading={isLoadingAppointments} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
      <Suspense
        fallback={
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <Skeleton className="h-[220px] w-full" />
              <Skeleton className="h-[220px] w-full" />
            </div>
          </div>
        }
      >
        <CustomerDetailsContent />
      </Suspense>
    </div>
  );
}
