import { FORMAT } from '@shared/date-utils';
import type { BookingRequest } from '@shared/booking';
import type { AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import moment from 'moment';

/**
 * Draft appointment fields from a booking request for calendar placement (no saved appointment yet).
 */
export function bookingRequestToPlacementDraft(req: BookingRequest): AppointmentSchemaType {
  const tenantRaw = req.tenantId;
  const tenantId =
    typeof tenantRaw === 'string'
      ? tenantRaw
      : tenantRaw !== undefined && tenantRaw !== null
        ? String(tenantRaw)
        : '';

  const customerId =
    typeof req.customerId === 'string' && req.customerId.trim() !== ''
      ? req.customerId.trim()
      : undefined;

  return {
    resourceId: '',
    duration: 1.5,
    customer: req.name || '',
    start: req.start ? moment(req.start).format(FORMAT) : moment().format(FORMAT),
    end: req.end ? moment(req.end).format(FORMAT) : moment().format(FORMAT),
    notes: req.comments || '',
    phone: req.phone ?? null,
    vehicle: req.vehicle || '',
    service: req.service || '',
    email: req.email ?? null,
    reminded: false,
    checkedIn: false,
    status: '',
    tenantId,
    bookingRequestId: req._id || '',
    isConfirmed: false,
    ...(customerId ? { customerId } : {}),
  };
}
