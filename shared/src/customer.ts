export type Customer = {
  _id?: string;
  name?: string;
  email?: string;
  /** Lowercase trimmed email used for tenant-scoped dedupe lookups. */
  emailNormalized?: string | null;
  tenantId?: string;
  phone?: string;
  /** Digits-based key for tenant-scoped dedupe (see `normalizePhoneForLookup`). */
  phoneNormalized?: string | null;
  createdDate?: string;
  updatedDate?: string;
  /** ISO timestamp when merged away or otherwise archived; omitted/null for active customers. */
  deletedAt?: string | null;
  /** If set with `deletedAt`, customer row that absorbed this profile (merge). */
  mergedIntoCustomerId?: string | null;
};

export type CustomerWithStats = Customer & {
  appointmentCount: number;
  lastAppointmentDate?: string;
  /** Booking inbox rows with `customerId` pointing at this profile. */
  bookingRequestCount: number;
};
