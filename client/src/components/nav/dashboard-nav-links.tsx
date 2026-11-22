import { useMemo, type ReactNode } from 'react';
import { Building, Calendar, Cog, UserCheck, UserCircle } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { useAuth } from '@/pages/auth/auth-provider';
import { cn } from '@/lib/utils';
import { APP_ROLE, hasMinimumAppRole } from '@shared/app-rbac';
import { RequestsNavItem } from './notification-icon';

type DashboardNavItem = {
  title: string;
  url: string;
  tourId: string;
  /** Omitted for `nav-requests` (handled by `RequestsNavItem`). */
  children?: ReactNode;
};

export function DashboardNavLinks() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const items = useMemo((): DashboardNavItem[] => {
    const role = user?.role;
    const nav: DashboardNavItem[] = [
      {
        title: 'Schedule',
        url: '/dashboard/schedule',
        children: <Calendar className="size-5 shrink-0" aria-hidden />,
        tourId: 'nav-schedule',
      },
      {
        title: 'Requests',
        url: '/dashboard/requests',
        tourId: 'nav-requests',
      },
      {
        title: 'Customers',
        url: '/dashboard/customers',
        children: <UserCircle className="size-5 shrink-0" aria-hidden />,
        tourId: 'nav-customers',
      },
      {
        title: 'Team',
        url: '/dashboard/technicians',
        children: <UserCheck className="size-5 shrink-0" aria-hidden />,
        tourId: 'nav-team',
      },
      {
        title: 'Settings',
        url: '/dashboard/settings/operations',
        children: <Cog className="size-5 shrink-0" aria-hidden />,
        tourId: 'nav-settings',
      },
    ];

    if (hasMinimumAppRole(role, APP_ROLE.ADMIN)) {
      nav.push({
        title: 'Tenant',
        url: '/dashboard/tenant',
        children: <Building className="size-5 shrink-0" aria-hidden />,
        tourId: 'nav-tenant',
      });
    }

    return nav;
  }, [user?.role]);

  return (
    <div className="flex min-w-0 flex-1 justify-center gap-1 sm:gap-2">
      {items.map(item => (
        <NavLink
          key={item.title}
          to={item.url}
          data-tour={item.tourId}
          className={({ isActive }) => {
            const active =
              item.tourId === 'nav-team'
                ? pathname.startsWith('/dashboard/technicians')
                : item.tourId === 'nav-settings'
                  ? pathname.startsWith('/dashboard/settings')
                  : item.tourId === 'nav-customers'
                    ? pathname.startsWith('/dashboard/customers')
                    : isActive;
            return cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-xs border-2 px-1.5 py-1 text-sm sm:gap-2 sm:px-2',
              item.tourId === 'nav-requests' && 'z-20',
              'transition-[background-color,box-shadow,border-color,color] duration-150 ease-out',
              active
                ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:border-muted-foreground/45 hover:bg-muted/70'
            );
          }}
        >
          {item.tourId === 'nav-requests' ? (
            <RequestsNavItem title={item.title} />
          ) : (
            <>
              {item.children}
              <span className="hidden md:inline-block">{item.title}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
