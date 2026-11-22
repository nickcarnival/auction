import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

type NoTechniciansScreenProps = {
  /** True when there are technicians, but none are marked active (schedule has no columns). */
  allInactive?: boolean;
};

export const NoTechniciansScreen = ({ allInactive = false }: NoTechniciansScreenProps) => {
  return (
    <div className="flex items-center justify-center w-full h-full bg-muted">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <Calendar className="h-16 w-16 text-muted-foreground" />
                <div className="absolute -bottom-2 -right-2 bg-destructive rounded-full p-1">
                  <Users className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {allInactive ? 'No active technicians' : 'Add Technicians to Get Started'}
              </h2>
              <p className="text-muted-foreground">
                {allInactive ? (
                  <>
                    Everyone is marked inactive, so the schedule has no columns. Open Technicians to
                    turn someone back on, or add a new person.
                  </>
                ) : (
                  <>
                    Your calendar is ready to go! Add your first technician to start scheduling
                    appointments and managing your business.
                  </>
                )}
              </p>
            </div>

            {/* Action Button */}
            <div className="space-y-3">
              <Link to="/dashboard/technicians" className="w-full">
                <Button className="w-full bg-action hover:bg-action-hover text-primary-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  {allInactive ? 'Manage technicians' : 'Add Your First Technician'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <p className="text-sm text-muted-foreground">
                {allInactive
                  ? 'Inactive technicians stay in your list and can be reactivated anytime.'
                  : 'Technicians appear as columns in your calendar and can be assigned to appointments'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
