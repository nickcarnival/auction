import { ApiError } from '@/errors/api-error';
import { getDb } from '@/db';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

const COLLECTION = 'services';

router.get('/delete-all', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    if (req.ctx?.tenant.tier !== 'global') {
      return res
        .status(403)
        .json(ApiError.forbidden('FORBIDDEN_OPERATION', 'Not allowed').toJSON());
    }

    const db = await getDb();
    const collection = db.collection(COLLECTION);

    await collection.deleteMany({
      tenantId: new ObjectId(req.ctx!.tenantId),
    });

    res.json({
      message: 'Deleted all',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to delete services').toJSON());
  }
});

export default router;
