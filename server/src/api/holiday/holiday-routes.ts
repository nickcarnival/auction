import { Router, type Request, type Response } from 'express';
import { listHolidaysForClient } from './holiday-service';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

router.get('/', requireAppRole(APP_ROLE.USER), async (_req: Request, res: Response) => {
  try {
    const holidays = await listHolidaysForClient();
    res.json(holidays);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load holidays' });
  }
});

export default router;
