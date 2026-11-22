import { ApiError } from '@/errors/api-error';
import { Router, type Request, type Response } from 'express';
import { getDb } from '@/db';
import { conditionalCreateCustomer } from '@/api/customer/customer-service';
import type { BookingRequest } from '@shared/booking';
import { ObjectId } from 'mongodb';
import { getEnv } from '@/utils/get-env';
import { getTenantById } from '@/api/tenant/tenant-service';
import { EMAIL_TEMPLATES, sendEmail } from '@/email/email-service';
import { REMINDER_EMAIL_FROM } from '@shared/customer-reminder';
import { pickPrimaryBusinessName } from '@shared/tenant';
import { normalizeCustomerStoredName } from '@shared/customer-name-utils';

function formatBookingRequestDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const BOOKING_CONFIRM_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Dropped from public POST /request body; server sets its own values on insert. */
const SERVER_STRIP_FROM_BOOKING_REQUEST = [
  'read',
  'readAt',
  'readBy',
  'rejected',
  'isConfirmed',
  'followUpAt',
  'followUpNote',
  'lastStaleAutoFollowUpAt',
  'createdDate',
  'updatedDate',
  'linkedAppointments',
] as const;

const router = Router();

// The form hits this one
router.post('/request', async (req: Request<{}, {}, BookingRequest>, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection('booking-request');

    /** Strip server-owned / computed fields; clients may send schema extras. */
    const body = req.body as BookingRequest & { updatedDate?: string };
    const bodyId = body._id;
    const bookingFields = { ...body } as Record<string, unknown>;
    delete bookingFields._id;
    for (const key of SERVER_STRIP_FROM_BOOKING_REQUEST) {
      delete bookingFields[key];
    }

    if (!bookingFields.tenantId || bodyId) {
      return res
        .status(400)
        .json(
          ApiError.badRequest('BOOKING_REQUEST_INVALID', 'Invalid booking request').toJSON()
        );
    }

    const nameTrimmed = normalizeCustomerStoredName(
      typeof bookingFields.name === 'string' ? bookingFields.name : ''
    );
    if (!nameTrimmed) {
      return res
        .status(400)
        .json(ApiError.badRequest('NAME_REQUIRED', 'Name is required').toJSON());
    }

    const tenantIdStr = String(bookingFields.tenantId);

    const customer = await conditionalCreateCustomer(
      {
        customer: nameTrimmed,
        phone: typeof bookingFields.phone === 'string' ? bookingFields.phone : null,
        email: typeof bookingFields.email === 'string' ? bookingFields.email : null,
      },
      tenantIdStr
    );

    if (!customer?._id) {
      return res
        .status(400)
        .json(
          ApiError.badRequest(
            'CUSTOMER_RESOLUTION_FAILED',
            'Could not create or resolve customer'
          ).toJSON()
        );
    }

    const customerOid = new ObjectId(customer._id);

    const displayName =
      typeof customer.name === 'string' && customer.name.trim() ? customer.name : nameTrimmed;

    const request = await collection.insertOne({
      ...bookingFields,
      name: displayName,
      tenantId: new ObjectId(tenantIdStr),
      customerId: customerOid,
      readAt: null,
      readBy: null,
      rejected: false,
      isConfirmed: false,
      createdDate: new Date(), // Proper Date object, not string
      _id: undefined,
    });

    const customerEmail =
      typeof bookingFields.email === 'string' ? bookingFields.email.trim().toLowerCase() : '';
    if (customerEmail && BOOKING_CONFIRM_EMAIL.test(customerEmail)) {
      try {
        const tenant = await getTenantById(tenantIdStr);
        if (tenant) {
          const shopName =
            pickPrimaryBusinessName(tenant) || String(tenant.name ?? '').trim() || 'Your shop';
          const subjectShop = shopName.replace(/[\r\n]/g, ' ').trim() || 'your shop';
          await sendEmail({
            from: REMINDER_EMAIL_FROM,
            to: [customerEmail],
            subject: `We received your request — ${subjectShop}`,
            html: EMAIL_TEMPLATES.bookingRequestReceived({
              shopName,
              customerName: displayName,
              preferredDropoff: formatBookingRequestDate(bookingFields.start),
              preferredPickup: formatBookingRequestDate(bookingFields.end),
              vehicle:
                typeof bookingFields.vehicle === 'string' ? bookingFields.vehicle : undefined,
              comments:
                typeof bookingFields.comments === 'string' ? bookingFields.comments : undefined,
              shopPhone: typeof tenant.phone === 'string' ? tenant.phone : undefined,
            }),
          });
        }
      } catch (e) {
        console.error('booking_confirmation_email_failed', e);
      }
    }

    res.status(201).json(request);
  } catch (e) {
    console.error(e);
    res
      .status(400)
      .json(
        ApiError.badRequest('BOOKING_REQUEST_FAILED', 'Could not submit booking request').toJSON()
      );
  }
});

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

router.post('/verify', async (req: Request<{}, {}, { userResponse: string }>, res: Response) => {
  try {
    const { CAPTCHA_SECRET } = getEnv();

    const { userResponse } = req.body;

    if (!CAPTCHA_SECRET || !userResponse) {
      return res
        .status(400)
        .json(
          ApiError.badRequest('CAPTCHA_CONFIG', 'Verification is not available').toJSON()
        );
    }

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: CAPTCHA_SECRET,
        response: userResponse,
      }).toString(),
      credentials: 'include',
    });

    const thing = await response.json();

    res.json({
      success: thing.success,
    });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json(ApiError.internal('Captcha verification failed').toJSON());
  }
});

export default router;
