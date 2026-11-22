import type { Resource } from './resource';
import { isSchedulableResource, sortResourcesByOrder } from './resource';

export type TechnicianCohort = 'active' | 'inactive';

export function technicianCohortType(tech: Resource): TechnicianCohort {
  return isSchedulableResource(tech) ? 'active' : 'inactive';
}

export function cohortResourcesOfType(resources: Resource[], cohort: TechnicianCohort): Resource[] {
  return resources.filter(r => {
    if (r._id == null || r._id === '') {
      return false;
    }
    return cohort === 'active' ? isSchedulableResource(r) : !isSchedulableResource(r);
  });
}

/** 1-based position within the technician’s cohort (active vs inactive), by current order then name. */
export function cohortSlotOneIndexed(resources: Resource[], technicianId: string): number | undefined {
  const tech = resources.find(r => r._id === technicianId);
  if (tech?._id == null) {
    return undefined;
  }
  const cohort = sortResourcesByOrder(cohortResourcesOfType(resources, technicianCohortType(tech)));
  const idx = cohort.findIndex(r => r._id === technicianId);
  return idx === -1 ? undefined : idx + 1;
}

/** After moving one technician to a 1-based slot, return `{_id, order}` for rows whose `order` must change (compact 1..n). */
export function computeCompactOrderUpdates(
  resources: Resource[],
  movedId: string,
  newSlotOneIndexed: number
): Array<{ _id: string; order: number }> {
  const moved = resources.find(r => r._id === movedId);
  if (moved?._id == null) {
    return [];
  }

  const cohortType = technicianCohortType(moved);
  const cohort = sortResourcesByOrder(cohortResourcesOfType(resources, cohortType)) as (Resource & {
    _id: string;
  })[];

  const n = cohort.length;
  if (n === 0) {
    return [];
  }

  const slot = Math.max(1, Math.min(n, Math.trunc(newSlotOneIndexed)));

  const others = cohort.filter(r => r._id !== movedId);
  const inserted: (Resource & { _id: string })[] = [
    ...others.slice(0, slot - 1),
    moved as Resource & { _id: string },
    ...others.slice(slot - 1),
  ];

  const updates: Array<{ _id: string; order: number }> = [];
  inserted.forEach((r, i) => {
    const order = i + 1;
    if (r.order !== order) {
      updates.push({ _id: r._id, order });
    }
  });
  return updates;
}

/**
 * Inserting a new technician at `desiredSlotOneIndexed` (1..n+1). Patch existing cohort members first,
 * then create the new row with `newTechnicianOrder`.
 */
export function computeCompactOrderForNewTechnician(
  resources: Resource[],
  cohortType: TechnicianCohort,
  desiredSlotOneIndexed: number
): { updates: Array<{ _id: string; order: number }>; newTechnicianOrder: number } {
  const cohort = sortResourcesByOrder(cohortResourcesOfType(resources, cohortType));
  const n = cohort.length;
  const maxSlot = n + 1;
  const slot = Math.max(1, Math.min(maxSlot, Math.trunc(desiredSlotOneIndexed)));
  const insertIdx = slot - 1;

  const updates: Array<{ _id: string; order: number }> = [];
  cohort.forEach((r, j) => {
    if (r._id == null) {
      return;
    }
    const newOrder = j < insertIdx ? j + 1 : j + 2;
    if (r.order !== newOrder) {
      updates.push({ _id: r._id, order: newOrder });
    }
  });

  return { updates, newTechnicianOrder: slot };
}
