import { ApiError } from '@/errors/api-error';
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db';
import { ObjectId } from 'mongodb';
import type { Resource } from '@shared/resource';
import { tenantIdMatchClause } from '@/utils/tenant-db-filter';
import { scheduleRecordUserEvent } from '@/api/analytics/record-request-event';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

const COLLECTION = 'resources';

router.get('/get-all', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    const tenantId = req.ctx?.tenantId;
    if (!tenantId) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    const docs = await collection
      .find({
        tenantId: new ObjectId(tenantId),
      })
      .toArray();

    res.json(
      docs.map(x => ({
        ...x,
        _id: x._id.toHexString(),
      })) as unknown as Resource[]
    );
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load resources').toJSON());
  }
});

router.post('/update', requireAppRole(APP_ROLE.USER), async (req: Request<{}, {}, Resource>, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    const resource = req.body;

    if (!resource._id) {
      return res
        .status(400)
        .json(ApiError.badRequest('MISSING_RESOURCE_ID', 'Resource id is required').toJSON());
    }

    const _id: ObjectId = new ObjectId(resource._id);

    const weeklyOffDays = Array.isArray(resource.weeklyOffDays)
      ? [...new Set(resource.weeklyOffDays)]
          .filter(
            (n): n is number =>
              typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6
          )
          .sort((a, b) => a - b)
      : [];

    const $set: Record<string, unknown> = {
      name: resource.name,
      color: resource.color,
      email: resource.email,
      isActive: resource.isActive,
      weeklyOffDays,
      updatedDate: new Date().toLocaleDateString(),
    };
    const updateDoc: {
      $set: Record<string, unknown>;
      $unset?: Record<string, ''>;
    } = { $set };

    if (resource.order === null) {
      updateDoc.$unset = { order: '' };
    } else if (
      typeof resource.order === 'number' &&
      Number.isInteger(resource.order) &&
      resource.order >= 1
    ) {
      $set.order = resource.order;
    }

    const tenantIdHex = req.ctx?.tenantId;
    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const thing = await collection.updateOne({ _id, ...tenantIdMatchClause(tenantIdHex) }, updateDoc);

    scheduleRecordUserEvent(req, 'resources.updated', { category: 'team' });
    res.json(thing);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to update resource').toJSON());
  }
});

router.post('/delete', requireAppRole(APP_ROLE.USER), async (req: Request<{}, {}, Resource>, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    const resource = req.body;

    if (!resource._id) {
      return res
        .status(400)
        .json(ApiError.badRequest('MISSING_RESOURCE_ID', 'Resource ID is required').toJSON());
    }

    const _id: ObjectId = new ObjectId(resource._id);

    const tenantIdHex = req.ctx?.tenantId;
    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const result = await collection.updateOne(
      { _id, ...tenantIdMatchClause(tenantIdHex) },
      {
        $set: {
          isActive: false,
          updatedDate: new Date().toLocaleDateString(),
        },
      }
    );

    scheduleRecordUserEvent(req, 'resources.deactivated', { category: 'team' });
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to delete resource').toJSON());
  }
});

router.post('/create', requireAppRole(APP_ROLE.USER), async (req: Request<{}, {}, Resource>, res: Response) => {
  try {
    const tenantIdHex = req.ctx?.tenantId;
    if (!tenantIdHex) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    const resource = req.body;

    const weeklyOffDaysCreate = Array.isArray(resource.weeklyOffDays)
      ? [...new Set(resource.weeklyOffDays)]
          .filter(
            (n): n is number =>
              typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 6
          )
          .sort((a, b) => a - b)
      : [];

    const doc = {
      ...resource,
      weeklyOffDays: weeklyOffDaysCreate,
      tenantId: new ObjectId(tenantIdHex),
      createdDate: new Date().toLocaleDateString(),
      updatedDate: new Date().toLocaleDateString(),
      isActive: true,
      _id: undefined,
    };
    if (
      doc.order === null ||
      doc.order === undefined ||
      typeof doc.order !== 'number' ||
      !Number.isInteger(doc.order) ||
      doc.order < 1
    ) {
      delete (doc as { order?: unknown }).order;
    }

    await collection.insertOne(doc);

    scheduleRecordUserEvent(req, 'resources.created', { category: 'team' });
    res.json({
      message: 'Added RESOURCE',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to create resource').toJSON());
  }
});

/** Deletes all resources for the current tenant; restricted to global tier. */
router.get('/delete-all', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    if (req.ctx?.tenant.tier !== 'global') {
      return res
        .status(403)
        .json(ApiError.forbidden('FORBIDDEN_OPERATION', 'Not allowed').toJSON());
    }

    const tenantId = req.ctx?.tenantId;
    if (!tenantId) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const db = await getDb();
    const collection = db.collection(COLLECTION);

    await collection.deleteMany({
      tenantId: new ObjectId(tenantId),
    });

    res.json({
      message: 'Deleted all',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to delete resources').toJSON());
  }
});

export default router;
