import type { CustomerWithStats } from '@shared/customer';

/** How the customer directory list is ordered (client-side, after fetch). */
export type CustomerListSortOption = 'default' | 'appointments' | 'requests' | 'recent';

/**
 * Returns a sorted copy of `customers` for the directory grid.
 */
export function sortCustomersForList(
  customers: CustomerWithStats[],
  sortBy: CustomerListSortOption
): CustomerWithStats[] {
  const customersCopy = [...customers];

  switch (sortBy) {
    case 'appointments':
      return customersCopy.sort((a, b) => b.appointmentCount - a.appointmentCount);
    case 'requests':
      return customersCopy.sort(
        (a, b) => (b.bookingRequestCount ?? 0) - (a.bookingRequestCount ?? 0)
      );
    case 'recent':
      return customersCopy.sort((a, b) => {
        if (a.lastAppointmentDate && !b.lastAppointmentDate) return -1;
        if (!a.lastAppointmentDate && b.lastAppointmentDate) return 1;
        if (a.lastAppointmentDate && b.lastAppointmentDate) {
          return (
            new Date(b.lastAppointmentDate).getTime() - new Date(a.lastAppointmentDate).getTime()
          );
        }
        const dateA = new Date(a.createdDate || '').getTime();
        const dateB = new Date(b.createdDate || '').getTime();
        return dateB - dateA;
      });
    default:
      return customersCopy;
  }
}
