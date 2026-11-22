import { Router } from 'express';
import { getUserEventSummaryForTenant, listUserEventsForAdmin } from './analytics-service';
import { z } from 'zod';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  tenantId: z.string().trim().min(1).optional(),
});

const tenantSummaryQuerySchema = z.object({
  tenantId: z.string().trim().min(1).max(32),
});

/** Global admin: total + per-action counts for one tenant. */
router.get('/tenant-summary', requireAppRole(APP_ROLE.ADMIN), async (req, res) => {
  const parsed = tenantSummaryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_query' });
    return;
  }

  try {
    const summary = await getUserEventSummaryForTenant(parsed.data.tenantId);
    res.json(summary);
  } catch (e) {
    console.error('[analytics] tenant-summary', e);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

/** Global admin: recent events, optional filter by tenant. */
router.get('/events', requireAppRole(APP_ROLE.ADMIN), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_query' });
    return;
  }

  const limit = parsed.data.limit ?? 100;

  try {
    const rows = await listUserEventsForAdmin({
      limit,
      tenantId: parsed.data.tenantId,
    });
    res.json(rows);
  } catch (e) {
    console.error('[analytics] list', e);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

export default router;
