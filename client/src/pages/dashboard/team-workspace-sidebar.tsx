import { TechnicianColorSwatch } from '@/components/resources/technician-color-swatch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  TECHNICIANS_PATH,
  technicianDetailPath,
  workspaceManagerDetailPath,
} from '@/lib/technician-settings-url';
import type { Resource } from '@shared/resource';
import type { User } from '@shared/user';
import { MotorbikeIcon } from '@/components/manage-appointment/motorbike-icon';
import {
  Bell,
  ChevronRight,
  Clock,
  CreditCard,
  Database,
  FolderTree,
  Globe,
  UserCog,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';

const SETTINGS_NAV = [
  { to: '/dashboard/settings/operations', label: 'Operations', icon: Clock },
  { to: '/dashboard/settings/business', label: 'Booking page', icon: Globe },
  { to: '/dashboard/settings/billing', label: 'Billing', icon: CreditCard },
  { to: '/dashboard/settings/data', label: 'Data', icon: Database },
  { to: '/dashboard/settings/motorcycles', label: 'Motorcycles', icon: MotorbikeIcon },
  { to: '/dashboard/settings/notifications', label: 'Notifications', icon: Bell },
] as const;

export type TeamWorkspaceSidebarProps = {
  activeTechnicians: (Resource & { _id: string })[];
  inactiveTechnicians: (Resource & { _id: string })[];
  currentId: string;
  onItemNavigate?: () => void;
  activeManagers: (User & { _id: string })[];
  pendingManagers: (User & { _id: string })[];
  managerTreeCurrentId: string;
  className?: string;
  /**
   * When false, only Settings links are shown (billing-only shell — no team API data).
   * @default true
   */
  showTeamNav?: boolean;
  /**
   * When false, manager names are shown without links (users who cannot edit workspace accounts).
   * @default true
   */
  managerDetailLinks?: boolean;
};

function TreeGroup({
  label,
  count,
  defaultOpen = true,
  children,
}: {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-1 rounded-sm px-1 py-1 text-left text-xs font-medium text-foreground hover:bg-muted/80"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90'
          )}
          aria-hidden
        />
        <span className="truncate">{label}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">{count}</span>
      </button>
      {open ? (
        <ul className="ml-2 space-y-0.5 border-l border-border/80 pl-2">{children}</ul>
      ) : null}
    </div>
  );
}

function ManagerTreeRow({
  manager,
  managerTreeCurrentId,
  onNavigate,
  linkToDetail,
}: {
  manager: User & { _id: string };
  managerTreeCurrentId: string;
  onNavigate?: () => void;
  linkToDetail: boolean;
}) {
  const selected = managerTreeCurrentId !== '' && manager._id === managerTreeCurrentId;

  const rowClass = cn(
    'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
    linkToDetail
      ? selected
        ? 'bg-primary/10 font-medium text-foreground ring-1 ring-inset ring-primary/25'
        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
      : 'cursor-default text-muted-foreground'
  );

  return (
    <li>
      {linkToDetail ? (
        <Link
          to={workspaceManagerDetailPath(manager._id)}
          onClick={() => onNavigate?.()}
          className={rowClass}
          aria-current={selected ? 'page' : undefined}
        >
          <UserCog className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 truncate">{manager.name}</span>
        </Link>
      ) : (
        <span className={rowClass}>
          <UserCog className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 truncate">{manager.name}</span>
        </span>
      )}
    </li>
  );
}

function TechnicianTreeRow({
  tech,
  currentId,
  onNavigate,
}: {
  tech: Resource & { _id: string };
  currentId: string;
  onNavigate?: () => void;
}) {
  const selected = currentId !== '' && tech._id === currentId;

  return (
    <li>
      <Link
        to={technicianDetailPath(tech._id)}
        onClick={() => onNavigate?.()}
        className={cn(
          'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
          selected
            ? 'bg-primary/10 font-medium text-foreground ring-1 ring-inset ring-primary/25'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
        )}
        aria-current={selected ? 'page' : undefined}
      >
        <TechnicianColorSwatch colorKey={tech.color} size="sm" />
        <span className="min-w-0 truncate">{tech.name}</span>
      </Link>
    </li>
  );
}

export function TeamWorkspaceSidebar({
  activeTechnicians: active,
  inactiveTechnicians: inactive,
  currentId,
  onItemNavigate,
  activeManagers,
  pendingManagers,
  managerTreeCurrentId,
  className,
  showTeamNav = true,
  managerDetailLinks = true,
}: TeamWorkspaceSidebarProps) {
  const overviewSelected = currentId === '' && managerTreeCurrentId === '';

  return (
    <nav
      className={cn('flex h-full min-h-0 flex-1 flex-col bg-muted/20', className)}
      aria-label="Team and settings"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full max-h-[100vh] lg:max-h-none">
          <div className="p-2 pr-3">
            <div className="mb-3 border-b border-border pb-2">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Settings
              </p>
              <ul className="space-y-0.5">
                {SETTINGS_NAV.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      onClick={() => onItemNavigate?.()}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 font-medium text-foreground ring-1 ring-inset ring-primary/25'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )
                      }
                    >
                      <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0 truncate">{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            {showTeamNav ? (
              <>
                <Link
                  to={TECHNICIANS_PATH}
                  onClick={() => onItemNavigate?.()}
                  className={cn(
                    'mb-2 flex items-center gap-1.5 rounded-sm px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                    overviewSelected
                      ? 'bg-primary/10 font-semibold text-foreground ring-1 ring-inset ring-primary/25'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                  aria-current={overviewSelected ? 'page' : undefined}
                >
                  <FolderTree className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  Technicians
                </Link>

                <TreeGroup label="Active" count={active.length} defaultOpen>
                  {active.map(t => (
                    <TechnicianTreeRow
                      key={t._id}
                      tech={t}
                      currentId={currentId}
                      onNavigate={onItemNavigate}
                    />
                  ))}
                </TreeGroup>

                {inactive.length > 0 ? (
                  <TreeGroup label="Inactive" count={inactive.length} defaultOpen={false}>
                    {inactive.map(t => (
                      <TechnicianTreeRow
                        key={t._id}
                        tech={t}
                        currentId={currentId}
                        onNavigate={onItemNavigate}
                      />
                    ))}
                  </TreeGroup>
                ) : null}

                <div className="mt-4 mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <UserCog className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  Managers
                </div>

                <TreeGroup label="Active" count={activeManagers.length} defaultOpen>
                  {activeManagers.map(m => (
                    <ManagerTreeRow
                      key={m._id}
                      manager={m}
                      managerTreeCurrentId={managerTreeCurrentId}
                      onNavigate={onItemNavigate}
                      linkToDetail={managerDetailLinks}
                    />
                  ))}
                </TreeGroup>

                {pendingManagers.length > 0 ? (
                  <TreeGroup label="Pending" count={pendingManagers.length} defaultOpen={false}>
                    {pendingManagers.map(m => (
                      <ManagerTreeRow
                        key={m._id}
                        manager={m}
                        managerTreeCurrentId={managerTreeCurrentId}
                        onNavigate={onItemNavigate}
                        linkToDetail={managerDetailLinks}
                      />
                    ))}
                  </TreeGroup>
                ) : null}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    </nav>
  );
}
