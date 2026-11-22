import ErrorBoundary from '@/app/error-boundary';
import { Outlet } from 'react-router';
import { DashboardProviders } from './dashboard-providers';
import { DashboardBar } from '@/components/nav/nav-bar';
import { Page } from './page';
import { TourTrigger } from '@/components/tour/tour-trigger';

const DashboardLayout = () => {
  return (
    <DashboardProviders>
      <TourTrigger />
      <main className="flex h-full max-h-screen min-h-0 w-full max-w-screen flex-col overflow-hidden">
        <DashboardBar />
        <Page>
          <div
            className="flex min-h-0 h-full w-full flex-1 flex-col overflow-hidden"
            data-tour="dashboard-welcome"
          >
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </Page>
      </main>
    </DashboardProviders>
  );
};
export default DashboardLayout;
