/** Which inbox tab lists this request (server filters GET /bookings/get-all). */
export type BookingRequestQueue = 'pending' | 'followups' | 'confirmed' | 'rejected';

/** Minimal appointment row returned with booking requests (same `bookingRequestId` on calendar). */
export type BookingRequestLinkedAppointment = {
  _id: string;
  start?: string;
  end?: string;
  /** Business hours (shop calendar), same units as `Appointment.duration`. */
  duration?: number;
  isConfirmed?: boolean;
  resourceId?: string;
};

export type BookingRequest = {
  _id: string;
  name: string;
  tenantId?: string;
  /** Resolved `customers` row for this request (set on create / server-side). */
  customerId?: string;
  phone?: string;
  email?: string;
  service?: string;
  vehicle?: string;
  year?: string;
  model?: string;
  make?: string;
  date?: string;
  comments?: string;
  start?: string;
  end?: string;

  /** Derived: true when `readAt` is set (not stored separately in DB). */
  read?: boolean;
  /** Set when a dashboard user first opens the request; use with {@link readBy}. */
  readAt?: string;
  /** Hex user id of who first opened the request (if tracked). */
  readBy?: string;
  /**
   * When the team should follow up on this request (e.g. callback). Cleared when the request
   * is no longer a loose end (e.g. rejected, or a linked appointment is confirmed). ISO 8601.
   */
  followUpAt?: string | null;
  /** Staff-only context for follow-up (e.g. “left VM”, “call after hours”). Not for customers. */
  followUpNote?: string;
  /** Staff declined this request; shown only on the Rejected tab. */
  rejected?: boolean;
  rejectedDate?: string | Date;
  isConfirmed?: boolean; // Computed field: true if any associated appointment is confirmed
  /** Appointments on the schedule linked to this request (same `bookingRequestId`). */
  linkedAppointments?: BookingRequestLinkedAppointment[];
  createdDate?: string;
};
