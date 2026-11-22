import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  isScheduledTechnicianAppointment,
  useTechniciansOverviewAppointments,
} from './use-technicians-overview-appointments';
import { TechnicianDailyTimeline, TechnicianWeeklyTimeline } from './technician-appointment-timelines';
import { TechnicianTodayWork } from './technician-today-work';

type TechnicianDetailStatsProps = {
  resourceId: string;
};

export function TechnicianDetailStats({ resourceId }: TechnicianDetailStatsProps) {
  const { data: appointments = [], isLoading } = useTechniciansOverviewAppointments();

  const scheduledForTech = useMemo(() => {
    return appointments.filter(
      a => isScheduledTechnicianAppointment(a) && a.resourceId === resourceId
    );
  }, [appointments, resourceId]);

  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        <div className="space-y-3 py-4 first:pt-0">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full max-w-lg" />
        </div>
        <div className="grid gap-5 py-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-36 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <div className="py-4 first:pt-0">
        <TechnicianTodayWork appointments={scheduledForTech} />
      </div>
      <div className="grid gap-5 py-4 lg:grid-cols-2">
        <TechnicianDailyTimeline
          appointments={scheduledForTech}
          title="Daily jobs"
          subtitle="Hover any bar for the date, total count, and each job (time + customer)."
        />
        <TechnicianWeeklyTimeline
          appointments={scheduledForTech}
          title="Weekly jobs"
          subtitle="Hover any bar for the week range and the same job list for that week."
        />
      </div>
    </div>
  );
}
