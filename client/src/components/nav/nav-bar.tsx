import { Logo } from '../logo';
import { NavUser } from './nav-user';
import { DashboardNavLinks } from './dashboard-nav-links';
import { DashboardTrialStrip } from './dashboard-trial-strip';

export function DashboardBar() {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-background md:px-3">
      <div className="flex min-w-0 shrink items-center gap-2">
        <div className="hidden aspect-square size-8 shrink-0 items-center justify-center rounded-xs text-primary md:flex">
          <Logo className="size-8" />
        </div>
        <DashboardTrialStrip />
      </div>

      <DashboardNavLinks />

      <div className="flex shrink-0 items-center justify-end">
        <NavUser />
      </div>
    </div>
  );
}
