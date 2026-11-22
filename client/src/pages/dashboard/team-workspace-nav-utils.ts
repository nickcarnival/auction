import { sortTechniciansForNav } from '@/pages/dashboard/technicians/technicians-nav-utils';
import type { Resource } from '@shared/resource';
import { isSchedulableResource } from '@shared/resource';
import type { User } from '@shared/user';

export type TechnicianNavLists = {
  active: (Resource & { _id: string })[];
  inactive: (Resource & { _id: string })[];
};

/**
 * Sorted technician lists for the team workspace nav (one pass: order + active/inactive split).
 */
export function buildTechnicianNavLists(resources: Resource[]): TechnicianNavLists {
  const sorted = sortTechniciansForNav(resources);
  const active: (Resource & { _id: string })[] = [];
  const inactive: (Resource & { _id: string })[] = [];
  for (const t of sorted) {
    if (isSchedulableResource(t)) {
      active.push(t);
    } else {
      inactive.push(t);
    }
  }
  return { active, inactive };
}

export type ManagerNavLists = {
  activeManagers: (User & { _id: string })[];
  pendingManagers: (User & { _id: string })[];
};

/**
 * Managers for the team workspace nav: sorted by name, split by invite acceptance.
 */
export function buildManagerNavLists(managers: User[]): ManagerNavLists {
  const withId = managers.filter((m): m is User & { _id: string } => Boolean(m._id));
  const sorted = [...withId].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
  return {
    activeManagers: sorted.filter(m => m.active === true),
    pendingManagers: sorted.filter(m => m.active !== true),
  };
}
