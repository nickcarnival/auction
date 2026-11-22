/** Primary dashboard route for technicians (list + workspace users on the same page). */
export const TECHNICIANS_PATH = '/dashboard/technicians';

/**
 * @deprecated Prefer {@link TECHNICIANS_PATH}. Kept for bookmarks; old settings URL redirects here.
 */
export const TECHNICIANS_SETTINGS_PATH = TECHNICIANS_PATH;

/** Search param key — legacy deep links only; prefer {@link technicianDetailPath}. */
export const TECHNICIAN_ID_SEARCH_PARAM = 'technicianId';

export function technicianDetailPath(technicianId: string): string {
  return `${TECHNICIANS_PATH}/${encodeURIComponent(technicianId)}`;
}

/** Calendar column header and other links to a specific technician’s page. */
export function techniciansSettingsHref(technicianId: string): string {
  return technicianDetailPath(technicianId);
}

/** Invite flow for a workspace manager (same section as technicians). */
export const WORKSPACE_MANAGER_NEW_PATH = `${TECHNICIANS_PATH}/managers/new` as const;

export function workspaceManagerDetailPath(managerId: string): string {
  return `${TECHNICIANS_PATH}/managers/${encodeURIComponent(managerId)}`;
}
