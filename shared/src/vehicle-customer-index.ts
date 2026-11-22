/**
 * Build a tenant-wide index of vehicle descriptions → customers, using the same source as the
 * customer profile “Vehicles” list: distinct non-empty `vehicle` strings on appointments.
 */

export type AppointmentVehicleSlice = {
  vehicle?: string | null;
  customerId?: string | null;
  customer?: string | null;
};

export type VehicleCustomerRef = {
  /** Present when at least one appointment was linked to a saved customer row */
  customerId?: string;
  displayName: string;
};

export type VehicleCustomerRow = {
  vehicleDescription: string;
  customers: VehicleCustomerRef[];
};

function customerDedupeKey(customerId: string | undefined, displayName: string): string {
  const id = customerId?.trim();
  if (id) return `id:${id}`;
  const name = displayName.trim().toLowerCase();
  return `name:${name}`;
}

/**
 * Groups appointments by trimmed `vehicle` string and dedupes customers per vehicle.
 * Customers are sorted by display name; vehicles are sorted alphabetically.
 */
export function buildVehicleCustomerIndex(
  appointments: readonly AppointmentVehicleSlice[]
): VehicleCustomerRow[] {
  const byVehicle = new Map<string, Map<string, VehicleCustomerRef>>();

  for (const a of appointments) {
    const vehicleDescription = a.vehicle?.trim();
    if (!vehicleDescription) continue;

    const displayName = (a.customer?.trim() || 'Unknown customer').trim();
    const key = customerDedupeKey(a.customerId ?? undefined, displayName);

    let bucket = byVehicle.get(vehicleDescription);
    if (!bucket) {
      bucket = new Map();
      byVehicle.set(vehicleDescription, bucket);
    }

    const existing = bucket.get(key);
    const mergedId =
      (a.customerId?.trim() || existing?.customerId)?.trim() || undefined;
    const mergedName =
      existing?.displayName && existing.displayName !== 'Unknown customer'
        ? existing.displayName
        : displayName;

    bucket.set(key, {
      customerId: mergedId,
      displayName: mergedName,
    });
  }

  const rows: VehicleCustomerRow[] = [...byVehicle.entries()].map(
    ([vehicleDescription, customersMap]) => ({
      vehicleDescription,
      customers: [...customersMap.values()].sort((x, y) =>
        x.displayName.localeCompare(y.displayName, undefined, { sensitivity: 'base' })
      ),
    })
  );

  rows.sort((a, b) =>
    a.vehicleDescription.localeCompare(b.vehicleDescription, undefined, { sensitivity: 'base' })
  );

  return rows;
}
