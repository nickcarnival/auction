import { Resource } from './resource';

export type Appointment = {
  _id?: string;
  customer: string;
  /** Set when linked to a `customers` document. */
  customerId?: string;
  tenantId?: string;
  notes?: string;
  checkedIn?: boolean;
  status?: string;
  start?: string | undefined;
  duration?: number;
  phone?: string | null;
  email?: string | null;
  service?: string;
  vehicle?: string;
  reminded?: boolean;
  /**
   * This is really the `promised date`
   **/
  end?: string | undefined;
  resource?: Resource;
  resourceId?: string;
  bookingRequestId?: string;
  isConfirmed?: boolean;
};
