import { ApiError } from '@/errors/api-error';
import { Router, type Request, type Response } from 'express';
import { getDb } from '@/db';
import type { BookingRequest } from '@shared/booking';
import { ObjectId } from 'mongodb';
import {
  countBookingRequestsInQueue,
  getAllBookingRequests,
  getBookingRequestById,
  getBookingRequestsByCustomer,
  getUnreadBookingRequests,
  normalizeQueue,
} from './booking-service';
import { tenantIdMatchClause } from '@/utils/tenant-db-filter';
import { scheduleRecordUserEvent } from '@/api/analytics/record-request-event';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

// These are the internal routes
router.get('/get-all', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const { sortBy = 'createdDate', sortOrder = 'desc', queue } = req.query;

    const allBookingsReqs = await getAllBookingRequests(
      req.ctx?.tenantId,
      sortBy as string,
      sortOrder as 'asc' | 'desc',
      normalizeQueue(queue as string | undefined)
    );

    if (!allBookingsReqs) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    res.json(allBookingsReqs);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load booking requests').toJSON());
  }
});

/** Queue size for dashboard tabs (e.g. follow-ups badge); uses the same filters as `/get-all`. */
router.get('/queue-count', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const queue = normalizeQueue(req.query.queue as string | undefined);
    const count = await countBookingRequestsInQueue(req.ctx?.tenantId, queue);

    if (count === null) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    res.json({ count });
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to count booking requests').toJSON());
  }
});

router.get('/get-unread', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const unread = await getUnreadBookingRequests(req.ctx?.tenantId);

    if (!unread) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    res.json(unread);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load booking requests').toJSON());
  }
});

/** Authenticated list of booking-request queue items for the current tenant (internal dashboard). */
router.get('/request-booking', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection('booking-request');

    const tenantIdHex = req.ctx?.tenantId;
    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const docs = await collection
      .find({
        ...tenantIdMatchClause(tenantIdHex),
      })
      .toArray();

    res.json(
      docs.map(x => ({
        ...x,
        _id: x._id.toHexString(),
      })) as unknown as BookingRequest[]
    );
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load booking requests').toJSON());
  }
});

router.post(
  '/mark-as-read',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<{}, {}, { ids: string[] }>, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection('booking-request');

    const tenantIdHex = req.ctx?.tenantId;
    const user = req.ctx?.user;
    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    if (!user?._id) {
      return res
        .status(401)
        .json(ApiError.unauthorized('AUTH_REQUIRED', 'Authentication required').toJSON());
    }

    const { ids } = req.body;

    if (!ids.length || ids.some(x => typeof x !== 'string')) {
      return res
        .status(400)
        .json(ApiError.badRequest('INVALID_IDS', 'Invalid or missing ids').toJSON());
    }

    const readByHex = String(user._id);
    const now = new Date();
    const updatedDate = new Date().toLocaleDateString();

    await collection.bulkWrite(
      ids.map(id => ({
        updateOne: {
          filter: {
            _id: new ObjectId(id),
            ...tenantIdMatchClause(tenantIdHex),
            $or: [{ readAt: { $exists: false } }, { readAt: null }],
          },
          update: {
            $set: {
              readAt: now,
              readBy: readByHex,
              updatedDate,
            },
            $unset: { read: '' },
          },
        },
      }))
    );

    scheduleRecordUserEvent(req, 'booking_requests.marked_read', {
      category: 'booking_requests',
      count: ids.length,
    });
    res.json();
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to update booking requests').toJSON());
  }
});

router.post(
  '/mark-as-unread',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<{}, {}, { ids: string[] }>, res: Response) => {
    try {
      const db = await getDb();
      const collection = db.collection('booking-request');

      const tenantIdHex = req.ctx?.tenantId;
      if (!tenantIdHex) {
        return res
          .status(401)
          .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
      }

      const { ids } = req.body;

      if (!ids.length || ids.some(x => typeof x !== 'string')) {
        return res
          .status(400)
          .json(ApiError.badRequest('INVALID_IDS', 'Invalid or missing ids').toJSON());
      }

      const updatedDate = new Date().toLocaleDateString();

      await collection.bulkWrite(
        ids.map(id => ({
          updateOne: {
            filter: {
              _id: new ObjectId(id),
              ...tenantIdMatchClause(tenantIdHex),
            },
            update: {
              $set: {
                readAt: null,
                readBy: null,
                updatedDate,
              },
              $unset: { read: '' },
            },
          },
        }))
      );

      scheduleRecordUserEvent(req, 'booking_requests.marked_unread', {
        category: 'booking_requests',
        count: ids.length,
      });
      res.json();
    } catch (e) {
      console.error(e);
      res.status(500).json(ApiError.internal('Failed to update booking requests').toJSON());
    }
  }
);

router.post(
  '/reject',
  requireAppRole(APP_ROLE.USER),
  async (req: Request<{}, {}, { id: string }>, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection('booking-request');
    const tenantIdHex = req.ctx?.tenantId;
    const { id } = req.body;

    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    if (!id || typeof id !== 'string') {
      return res
        .status(400)
        .json(ApiError.badRequest('INVALID_ID', 'Invalid id').toJSON());
    }

    const user = req.ctx?.user;
    if (!user?._id) {
      return res
        .status(401)
        .json(ApiError.unauthorized('AUTH_REQUIRED', 'Authentication required').toJSON());
    }

    const now = new Date();
    const readByHex = String(user._id);

    const result = await collection.updateOne(
      {
        _id: new ObjectId(id),
        ...tenantIdMatchClause(tenantIdHex),
      },
      {
        $set: {
          rejected: true,
          rejectedDate: now,
          readAt: now,
          readBy: readByHex,
          followUpAt: null,
          updatedDate: new Date().toLocaleDateString(),
        },
        $unset: { read: '' },
      }
    );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json(ApiError.notFound('BOOKING_REQUEST_NOT_FOUND', 'Booking request not found').toJSON());
    }

    scheduleRecordUserEvent(req, 'booking_requests.rejected', { category: 'booking_requests' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json(ApiError.internal('Failed to reject booking request').toJSON());
  }
});

const FOLLOW_UP_NOTE_MAX_LENGTH = 2000;

router.post(
  '/follow-up',
  requireAppRole(APP_ROLE.USER),
  async (
    req: Request<{}, {}, { id: string; followUpAt: string | null; followUpNote?: string | null }>,
    res: Response
  ) => {
    try {
      const db = await getDb();
      const collection = db.collection('booking-request');
      const tenantIdHex = req.ctx?.tenantId;
      const { id, followUpAt, followUpNote: followUpNoteBody } = req.body;

      if (!tenantIdHex) {
        return res
          .status(401)
          .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
      }

      if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
        return res
          .status(400)
          .json(ApiError.badRequest('INVALID_ID', 'Valid id is required').toJSON());
      }

      if (followUpAt !== null && (typeof followUpAt !== 'string' || !followUpAt.trim())) {
        return res
          .status(400)
          .json(
            ApiError.badRequest('INVALID_FOLLOW_UP', 'followUpAt must be an ISO string or null').toJSON()
          );
      }

      let followUpDate: Date | null = null;
      if (followUpAt !== null) {
        const parsed = new Date(followUpAt);
        if (Number.isNaN(parsed.getTime())) {
          return res
            .status(400)
            .json(ApiError.badRequest('INVALID_FOLLOW_UP', 'Invalid follow-up date').toJSON());
        }
        followUpDate = parsed;
      }

      const $set: Record<string, unknown> = {
        followUpAt: followUpDate,
        updatedDate: new Date().toLocaleDateString(),
      };

      if ('followUpNote' in req.body) {
        if (followUpNoteBody == null) {
          $set.followUpNote = null;
        } else {
          if (typeof followUpNoteBody !== 'string') {
            return res
              .status(400)
              .json(
                ApiError.badRequest(
                  'INVALID_FOLLOW_UP_NOTE',
                  'followUpNote must be a string or null'
                ).toJSON()
              );
          }
          const trimmed = followUpNoteBody.trim();
          if (trimmed.length > FOLLOW_UP_NOTE_MAX_LENGTH) {
            return res
              .status(400)
              .json(
                ApiError.badRequest(
                  'FOLLOW_UP_NOTE_TOO_LONG',
                  `Note must be at most ${FOLLOW_UP_NOTE_MAX_LENGTH} characters`
                ).toJSON()
              );
          }
          $set.followUpNote = trimmed === '' ? null : trimmed;
        }
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(id), ...tenantIdMatchClause(tenantIdHex) },
        { $set }
      );

      if (result.matchedCount === 0) {
        return res
          .status(404)
          .json(
            ApiError.notFound('BOOKING_REQUEST_NOT_FOUND', 'Booking request not found').toJSON()
          );
      }

      scheduleRecordUserEvent(req, 'booking_requests.follow_up_set', { category: 'booking_requests' });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json(ApiError.internal('Failed to update follow-up date').toJSON());
    }
  }
);

router.get('/get-by-id/:id', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const tenantIdHex = req.ctx?.tenantId;
    const { id } = req.params;

    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    if (!id) {
      return res
        .status(400)
        .json(
          ApiError.badRequest('MISSING_ID', 'Booking request ID is required').toJSON()
        );
    }

    const booking = await getBookingRequestById(id, tenantIdHex);

    if (!booking) {
      return res
        .status(404)
        .json(
          ApiError.notFound('BOOKING_REQUEST_NOT_FOUND', 'Booking request not found').toJSON()
        );
    }

    res.json(booking);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json(ApiError.internal('Failed to fetch booking request').toJSON());
  }
});

router.get('/get-by-customer', requireAppRole(APP_ROLE.USER), async (req: Request, res: Response) => {
  try {
    const tenantId = req.ctx?.tenantId;

    if (!tenantId) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const { customerId } = req.query;
    if (!customerId || typeof customerId !== 'string') {
      return res
        .status(400)
        .json(ApiError.badRequest('MISSING_CUSTOMER_ID', 'customerId is required').toJSON());
    }

    const rows = await getBookingRequestsByCustomer(customerId, tenantId);
    if (!rows) {
      return res
        .status(400)
        .json(ApiError.badRequest('INVALID_CUSTOMER_ID', 'Invalid customerId').toJSON());
    }

    res.json(rows);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json(ApiError.internal('Failed to fetch booking requests').toJSON());
  }
});

export default router;
