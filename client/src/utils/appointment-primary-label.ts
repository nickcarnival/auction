import type { Appointment } from '@shared/appointment';

/**
 * Best short label for cards/lists: booking service when present, else assigned resource name.
 */
export function appointmentPrimaryLabel(a: Pick<Appointment, 'service' | 'resource'>): string {
  const svc = a.service?.trim();
  if (svc) return svc;
  const resourceName = a.resource?.name?.trim();
  if (resourceName) return resourceName;
  return 'No service on file';
}

/** Assigned technician / resource display name, or null if unknown. */
export function appointmentTechnicianName(a: Pick<Appointment, 'resource'>): string | null {
  const n = a.resource?.name?.trim();
  return n || null;
}
