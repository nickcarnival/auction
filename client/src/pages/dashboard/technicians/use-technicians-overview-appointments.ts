import { useMemo } from 'react';
import moment from 'moment';
import { useQuery } from '@tanstack/react-query';
import type { Appointment } from '@shared/appointment';
import { BASE_URL } from '@/utils/environment-util';

export function isScheduledTechnicianAppointment(a: Appointment): boolean {
  return a.status !== 'Vacation';
}

/** Same ±30d window as the schedule’s `get-all?start=` query (shared cache key for overview + per-tech stats). */
export function useTechniciansOverviewAppointments() {
  const statsDayKey = useMemo(() => moment().format('YYYY-MM-DD'), []);

  return useQuery({
    queryKey: ['get-all-appointments', 'technicians-overview', statsDayKey],
    queryFn: async () => {
      const start = moment().startOf('day').toDate();
      const response = await fetch(
        `${BASE_URL}/api/appointments/get-all?start=${encodeURIComponent(start.toISOString())}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        return [];
      }
      return (await response.json()) as Appointment[];
    },
  });
}
