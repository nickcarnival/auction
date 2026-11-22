import { useResourceContext } from '@/components/resources/resource-context';
import { Button } from '@/components/ui/button';
import { TECHNICIANS_PATH } from '@/lib/technician-settings-url';
import { TechnicianDetailStats } from '@/pages/dashboard/technicians/technician-detail-stats';
import { TechnicianInlineEditor } from '@/pages/dashboard/technicians/technician-inline-editor';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router';

export default function TechnicianDetailPage() {
  const { technicianId } = useParams<{ technicianId: string }>();
  const { resources, isLoadingResources, setCurrentResource } = useResourceContext();

  const resource = technicianId ? resources.find(r => r._id === technicianId) : undefined;

  useEffect(() => {
    return () => {
      setCurrentResource(prev => (prev?._id === technicianId ? null : prev));
    };
  }, [technicianId, setCurrentResource]);

  if (!technicianId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Invalid technician link.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-6 pt-2 lg:pt-4">
      {!isLoadingResources && !resource ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-muted-foreground">Technician not found.</p>
          <Button variant="outline" asChild>
            <Link to={TECHNICIANS_PATH}>Back to team</Link>
          </Button>
        </div>
      ) : !resource ? (
        <div className="space-y-4 py-2">
          <div className="h-36 max-w-xl animate-pulse rounded-lg bg-muted" />
          <div className="h-24 max-w-md animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <>
          <TechnicianInlineEditor resource={{ ...resource, _id: technicianId }} />
          <section className="space-y-2 pt-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schedule
            </h2>
            <TechnicianDetailStats resourceId={technicianId} />
          </section>
        </>
      )}
    </div>
  );
}
