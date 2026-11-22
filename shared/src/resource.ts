export type Resource = {
  _id?: string;
  /** Integer ≥ 1: lower sorts earlier. Omit or null (on save) = sort after everyone with a number. */
  order?: number | null;
  name: string;
  // jsdoc
  /*
   * The color of the resource
   * Preferably HEX
   */
  color?: string;
  email?: string | null;
  tenantId?: string;
  isActive?: boolean;
  /**
   * Weekdays this technician does not work, using `Date#getDay()`: 0 = Sunday … 6 = Saturday.
   * Omitted or empty means no recurring weekly day off.
   */
  weeklyOffDays?: number[];
};

/** True if `localDate` (tenant-local calendar day) is a configured weekly day off for this resource. */
export function isResourceWeeklyOffOnLocalDay(resource: Resource, localDate: Date): boolean {
  const off = resource.weeklyOffDays;
  if (off == null || off.length === 0) {
    return false;
  }
  return off.includes(localDate.getDay());
}

/**
 * Whether this technician gets schedule columns and appears in assignment pickers.
 * Missing `isActive` is treated as active (legacy rows).
 */
export function isSchedulableResource(resource: Resource): boolean {
  return resource.isActive !== false;
}

/** Rank for sorting: valid orders are integers ≥ 1 (1 = first); anything else sorts last. */
export function resourceOrderSortRank(order: number | null | undefined): number {
  if (typeof order === 'number' && Number.isInteger(order) && order >= 1) {
    return order;
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Same ordering as technician sidebar: `order` ascending (1 first), then name. */
export function compareResourcesBySortOrder(a: Resource, b: Resource): number {
  const oa = resourceOrderSortRank(a.order);
  const ob = resourceOrderSortRank(b.order);
  if (oa !== ob) {
    return oa - ob;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Stable copy sorted for schedule columns, pickers, and nav. */
export function sortResourcesByOrder(resources: Resource[]): Resource[] {
  return [...resources].sort(compareResourcesBySortOrder);
}

/**
 * For React `useMemo` deps when lists might be mutated in place: changes if id, order, or active flag changes.
 */
export function resourcesSortStateKey(resources: Resource[]): string {
  return resources
    .map(
      r =>
        `${r._id ?? ''}:${String(r.order ?? '')}:${r.isActive === false ? '0' : '1'}`
    )
    .join('|');
}
