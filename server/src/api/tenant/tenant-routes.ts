import { Router, type NextFunction, type Request, type Response } from 'express';
import { getDb } from '@/db';
import {
  createTenant,
  type CreateTenantInput,
  getTenantById,
  updateTenant,
  updateTenantBillingFlags,
  updateTenantStripePriceId,
  deleteTenant,
  approveTenant,
  backfillMissingTenantTrialEndsAt,
  SubdomainTakenError,
  SubdomainValidationError,
} from './tenant-service';
import { getStripe } from '@/api/stripe/stripe-client';
import { ApiError } from '@/errors/api-error';
import Stripe from 'stripe';
import type { Tenant } from '@shared/tenant';
import { filterObservedHolidayIds } from '../holiday/holiday-service';
import { DEFAULT_SHOP_HOURS } from '@shared/shop-hours';
import { normalizeShopClosedDates } from '@shared/holidays/tenant-closed-dates';
import { normalizeRecurringScheduleBlocks } from '@shared/recurring-schedule-block';
import { toTenantIdString } from '@shared/to-tenant-id-string';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

/**
 * Platform admin (`req.ctx.isGlobalAdmin`) or member of the tenant in `?_id=`.
 * Loads the tenant and sets {@link Request.tenantReadAccess} for the handler.
 */
async function requireTenantReadByQueryOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const id = req.query._id;
  if (!id || typeof id !== 'string') {
    res.status(400).json();
    return;
  }

  const tenant = await getTenantById(id);
  if (!tenant) {
    res.status(404).json();
    return;
  }

  const rctx = req.ctx;
  if (!rctx?.isGlobalAdmin && toTenantIdString(tenant._id) !== rctx?.tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  req.tenantReadAccess = tenant;
  next();
}

/** Platform admin or user updating their own workspace tenant (`body._id`). */
function requireTenantUpdateBodyOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.ctx?.user;
  const body = req.body as Partial<Tenant> & { _id?: string };

  if (!body._id) {
    res.status(400).json({ error: 'Tenant id required' });
    return;
  }

  const isPlatformAdmin = req.ctx?.isGlobalAdmin === true;
  const isOwnTenant =
    user?.tenantId != null && user.tenantId.toString() === body._id.toString();

  if (!user?._id || (!isPlatformAdmin && !isOwnTenant)) {
    res.status(401).send({
      error: 'nah bro',
    });
    return;
  }

  next();
}

const COLLECTION = 'tenant';

function isStripeResourceMissing(err: unknown): boolean {
  return err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing';
}

router.get('/get-all', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION);

    const docs = await collection.find().toArray();

    const tenants = await Promise.all(
      docs.map(async x => ({
        ...x,
        _id: x._id.toHexString(),
        shopHours: x.shopHours || DEFAULT_SHOP_HOURS,
        observedHolidayIds: await filterObservedHolidayIds(x.observedHolidayIds),
        shopClosedDates: normalizeShopClosedDates(x.shopClosedDates ?? []),
        recurringScheduleBlocks: normalizeRecurringScheduleBlocks(x.recurringScheduleBlocks ?? []),
      }))
    );

    res.json(tenants);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

router.get(
  '/get-by-id',
  requireAppRole(APP_ROLE.USER),
  requireTenantReadByQueryOrAdmin,
  async (req: Request, res: Response) => {
  try {
    res.json(req.tenantReadAccess!);
  } catch (e) {
    console.error(e);
    res.json();
  }
});

router.post(
  '/create',
  requireAppRole(APP_ROLE.ADMIN),
  async (req: Request<{}, {}, CreateTenantInput>, res: Response) => {
    try {
      const tenant = req.body as CreateTenantInput;

      await createTenant(tenant);

      res.json({
        message: 'Added tenant',
      });
    } catch (e) {
      console.error(e);
      if (e instanceof SubdomainTakenError) {
        return res.status(409).json({ error: e.message });
      }
      if (e instanceof SubdomainValidationError) {
        return res.status(400).json({ error: e.message });
      }
      res.json({
        message: 'Failed to add tenant',
      });
    }
  }
);

router.post(
  '/update',
  requireAppRole(APP_ROLE.USER),
  requireTenantUpdateBodyOrAdmin,
  async (req: Request<{}, {}, Tenant>, res: Response) => {
  try {
    const tenant = req.body as Partial<Tenant> & { _id?: string };

    await updateTenant(tenant as Partial<Tenant> & { _id: string });

    res.json({
      message: 'Updated tenant',
    });
  } catch (e) {
    console.error(e);
    if (e instanceof SubdomainTakenError) {
      return res.status(409).json({ error: e.message });
    }
    if (e instanceof SubdomainValidationError) {
      return res.status(400).json({ error: e.message });
    }
    res.json({
      message: 'Failed to Updated tenant',
    });
  }
});

// PATCH endpoint for admin-only tenant approval/activation
router.patch('/:id/approve', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID is required',
      });
    }

    // Approve the tenant
    const approvedTenant = await approveTenant(tenantId);
    if (!approvedTenant) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    res.json({
      message: 'Tenant approved successfully. Verification emails have been sent to all users.',
      tenant: approvedTenant,
    });
  } catch (e) {
    console.error('Error approving tenant:', e);
    res.status(500).json({
      message: 'Failed to approve tenant',
    });
  }
});

router.patch('/:id/billing-flags', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;

    if (!tenantId?.trim()) {
      return res
        .status(400)
        .json(ApiError.badRequest('TENANT_ID_REQUIRED', 'Tenant id required').toJSON());
    }

    const body = req.body as { billingExempt?: unknown };
    if (typeof body.billingExempt !== 'boolean') {
      return res
        .status(400)
        .json(ApiError.badRequest('INVALID_BODY', 'billingExempt must be a boolean').toJSON());
    }
    const billingExempt = body.billingExempt;

    const existing = await getTenantById(tenantId);
    if (!existing) {
      return res
        .status(404)
        .json(ApiError.notFound('TENANT_NOT_FOUND', 'Tenant not found').toJSON());
    }

    await updateTenantBillingFlags(tenantId, { billingExempt });
    const next = await getTenantById(tenantId);
    res.json({
      message: 'Billing flags updated',
      tenant: next,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update billing flags' });
  }
});

router.patch('/:id/stripe-price', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;

    if (!tenantId?.trim()) {
      return res
        .status(400)
        .json(ApiError.badRequest('TENANT_ID_REQUIRED', 'Tenant id required').toJSON());
    }

    const raw = (req.body as { stripePriceId?: unknown }).stripePriceId;
    let next: string | null;
    if (raw === null || raw === '') {
      next = null;
    } else if (typeof raw === 'string') {
      const t = raw.trim();
      next = t.length > 0 ? t : null;
    } else {
      return res
        .status(400)
        .json(
          ApiError.badRequest('INVALID_BODY', 'stripePriceId must be a string or null').toJSON()
        );
    }

    const existing = await getTenantById(tenantId);
    if (!existing) {
      return res
        .status(404)
        .json(ApiError.notFound('TENANT_NOT_FOUND', 'Tenant not found').toJSON());
    }

    if (next != null) {
      const stripe = getStripe();
      if (!stripe) {
        return res
          .status(503)
          .json(
            new ApiError(
              503,
              'BILLING_NOT_CONFIGURED',
              'Stripe is not configured on the server.'
            ).toJSON()
          );
      }
      try {
        await stripe.prices.retrieve(next);
      } catch (err: unknown) {
        if (isStripeResourceMissing(err)) {
          return res
            .status(400)
            .json(
              ApiError.badRequest(
                'STRIPE_PRICE_NOT_FOUND',
                'That Price id was not found in your Stripe account (check test vs live mode).'
              ).toJSON()
            );
        }
        console.error('[tenant] Stripe prices.retrieve', err);
        return res
          .status(502)
          .json(
            new ApiError(
              502,
              'STRIPE_UNAVAILABLE',
              'Could not verify the Stripe price. Try again.'
            ).toJSON()
          );
      }
    }

    await updateTenantStripePriceId(tenantId, next);
    res.json({ message: 'Stripe price updated', stripePriceId: next });
  } catch (e) {
    console.error(e);
    if (e instanceof SubdomainValidationError) {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: 'Failed to update Stripe price' });
  }
});

// DELETE endpoint for admin-only tenant deletion
router.delete('/:id', requireAppRole(APP_ROLE.ADMIN), async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Tenant ID is required',
      });
    }

    // Verify tenant exists before deletion
    const existingTenant = await getTenantById(tenantId);
    if (!existingTenant) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    // Perform cascading delete
    await deleteTenant(tenantId);

    res.json({
      message: 'Tenant and all associated data deleted successfully',
    });
  } catch (e) {
    console.error('Error deleting tenant:', e);
    res.status(500).json({
      message: 'Failed to delete tenant',
    });
  }
});

/** Global admin: set `trialEndsAt` to now + 30 days for all tenants missing it (one-time migration). */
router.post(
  '/backfill-trial-ends-at',
  requireAppRole(APP_ROLE.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const { matchedCount, modifiedCount } = await backfillMissingTenantTrialEndsAt();
      res.json({ matchedCount, modifiedCount });
    } catch (e) {
      console.error('[tenants] backfill-trial-ends-at', e);
      res.status(500).json({ error: 'Backfill failed' });
    }
  }
);

export default router;
