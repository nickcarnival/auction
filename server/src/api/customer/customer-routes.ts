import { ApiError } from '@/errors/api-error';
import { Router } from 'express';
import {
  getCustomersByTenantId,
  getCustomerById,
  getMergeSuggestionsForTenant,
  mergeCustomersIntoKeep,
  updateCustomerProfile,
  GetCustomersOptions,
} from './customer-service';
import { customerMergeRequestSchema } from '@shared/schemas/customer-merge-schema';
import { customerUpdateRequestSchema } from '@shared/schemas/customer-update-schema';
import { scheduleRecordUserEvent } from '@/api/analytics/record-request-event';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '@/middleware/require-app-role-middleware';

const router = Router();

router.get('/merge-suggestions', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    const tenantId = req.ctx?.tenantId;
    if (!tenantId) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }
    const suggestions = await getMergeSuggestionsForTenant(tenantId);
    res.json(suggestions);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load merge suggestions').toJSON());
  }
});

router.post('/merge', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    const parsed = customerMergeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false as const,
        ...ApiError.badRequest('INVALID_BODY', 'Invalid request body').toJSON(),
      });
      return;
    }
    const tenantId = req.ctx?.tenantId;
    if (!tenantId) {
      res.status(401).json({
        ok: false as const,
        ...ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON(),
      });
      return;
    }
    const result = await mergeCustomersIntoKeep(
      tenantId,
      parsed.data.keepCustomerId,
      parsed.data.mergeCustomerIds,
      parsed.data.profile
    );
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    scheduleRecordUserEvent(req, 'customers.merged', {
      category: 'customers',
      count: parsed.data.mergeCustomerIds.length,
    });
    res.json({ ok: true as const });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false as const,
      ...ApiError.internal('Merge failed').toJSON(),
    });
  }
});

router.get('/get-by-tenant-id', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    const search = req.query.search as string;
    const tenantId = req.ctx?.tenantId;

    if (!tenantId) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const options: GetCustomersOptions = {
      tenantId,
      search,
    };

    const customers = await getCustomersByTenantId(options);
    res.json(customers);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load customers').toJSON());
  }
});

router.get('/get-by-id', requireAppRole(APP_ROLE.USER), async (req, res) => {
  try {
    const customerId = req.query.customerId as string;
    const tenantId = req.ctx?.tenantId;

    if (!customerId) {
      return res
        .status(400)
        .json(ApiError.badRequest('MISSING_CUSTOMER_ID', 'customerId is required').toJSON());
    }

    if (!tenantId) {
      return res
        .status(401)
        .json(ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON());
    }

    const customer = await getCustomerById(customerId, tenantId);
    if (!customer) {
      return res.status(404).json(null);
    }
    res.json(customer);
  } catch (e) {
    console.error(e);
    res.status(500).json(ApiError.internal('Failed to load customer').toJSON());
  }
});

router.post('/update', requireAppRole(APP_ROLE.USER), async (req, res) => {
  const parsed = customerUpdateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false as const,
      ...ApiError.badRequest('INVALID_BODY', 'Invalid request body').toJSON(),
    });
    return;
  }
  const tenantId = req.ctx?.tenantId;
  if (!tenantId) {
    res.status(401).json({
      ok: false as const,
      ...ApiError.unauthorized('MISSING_TENANT', 'Unauthorized').toJSON(),
    });
    return;
  }
  const { customerId, name, email, phone } = parsed.data;
  const result = await updateCustomerProfile(tenantId, customerId, { name, email, phone });
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  scheduleRecordUserEvent(req, 'customers.updated', { category: 'customers' });
  res.json({ ok: true as const });
});

export default router;
