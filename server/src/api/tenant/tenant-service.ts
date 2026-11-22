import {
  DEFAULT_APP_TRIAL_DAYS,
  DEFAULT_PENDING_REQUEST_STALE_DAYS,
  pickPrimaryBusinessName,
  type Tenant,
} from '@shared/tenant';
import {
  normalizeTenantSubdomainSlug,
  tenantSubdomainSlugSchema,
} from '@shared/tenant-subdomain-slug';
import { normalizeShopClosedDates } from '@shared/holidays/tenant-closed-dates';
import { normalizeRecurringScheduleBlocks } from '@shared/recurring-schedule-block';
import {
  ensureHolidaysSeeded,
  filterObservedHolidayIds,
  getDefaultHolidayCodes,
} from '../holiday/holiday-service';
import { getDb } from '@/db';
import { ObjectId, type Db } from 'mongodb';
import { DEFAULT_SHOP_HOURS } from '@shared/shop-hours';
import { createHash } from '../auth/hashing';
import { inviteUser } from '../user/invite-service';
import { deletePasswordResetsForUserIds } from '../user/password-reset-service';

const COLLECTION = 'tenant';

function clampPendingStaleDays(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_PENDING_REQUEST_STALE_DAYS;
  }
  return Math.min(365, Math.max(7, Math.round(value)));
}

export class SubdomainTakenError extends Error {
  constructor() {
    super('This booking URL slug is already in use.');
    this.name = 'SubdomainTakenError';
  }
}

export class SubdomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubdomainValidationError';
  }
}

/**
 * New tenant payloads may omit `observedHolidayIds` (catalog defaults) and `shopClosedDates` (empty).
 */
export type CreateTenantInput = Omit<
  Tenant,
  'observedHolidayIds' | 'shopClosedDates' | 'recurringScheduleBlocks'
> & {
  observedHolidayIds?: string[];
  shopClosedDates?: Tenant['shopClosedDates'];
  recurringScheduleBlocks?: Tenant['recurringScheduleBlocks'];
};

/**
 * Merges partial updates with the existing tenant so optional tabs (business vs operations)
 * cannot wipe fields they don't send. Omitted `shopHours` no longer resets hours to defaults;
 * omitted `observedHolidayIds` preserves the tenant's holiday toggles.
 */
export const updateTenant = async (
  tenant: Partial<Tenant> & { _id: string }
): Promise<Tenant | null> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const existing = await getTenantById(tenant._id);
  if (!existing) {
    return null;
  }

  const tenantId = new ObjectId(tenant._id);

  const resolvedName = (() => {
    if (tenant.name !== undefined) {
      const next = String(tenant.name).trim();
      if (next.length >= 2) return next;
      const fallback = pickPrimaryBusinessName(existing) || String(existing.name ?? '').trim();
      if (fallback.length >= 2) return fallback;
      return next.length > 0 ? next : 'Business';
    }
    return pickPrimaryBusinessName(existing) || String(existing.name ?? '').trim() || 'Business';
  })();

  const resolvedShopHours =
    tenant.shopHours != null ? tenant.shopHours : existing.shopHours || DEFAULT_SHOP_HOURS;

  const resolvedObservedHolidayIds =
    tenant.observedHolidayIds !== undefined
      ? await filterObservedHolidayIds(tenant.observedHolidayIds)
      : await filterObservedHolidayIds(existing.observedHolidayIds);

  const resolvedShopClosedDates =
    tenant.shopClosedDates !== undefined
      ? normalizeShopClosedDates(tenant.shopClosedDates)
      : normalizeShopClosedDates(existing.shopClosedDates ?? []);

  const resolvedRecurringScheduleBlocks =
    tenant.recurringScheduleBlocks !== undefined
      ? normalizeRecurringScheduleBlocks(tenant.recurringScheduleBlocks)
      : normalizeRecurringScheduleBlocks(existing.recurringScheduleBlocks ?? []);

  const resolvedPendingStaleDays =
    tenant.pendingRequestStaleDays !== undefined
      ? clampPendingStaleDays(tenant.pendingRequestStaleDays)
      : clampPendingStaleDays(existing.pendingRequestStaleDays);

  const resolvedEmail = tenant.email !== undefined ? tenant.email : existing.email;
  const resolvedPhone = tenant.phone !== undefined ? tenant.phone : existing.phone;
  const resolvedRedirect =
    tenant.redirectUrl !== undefined ? tenant.redirectUrl : existing.redirectUrl;

  const cfg = await db.collection('subdomain-config').findOne({ tenantId });

  const existingSubNorm =
    typeof existing.subdomain === 'string' && existing.subdomain.trim()
      ? normalizeTenantSubdomainSlug(existing.subdomain)
      : '';
  const configSlug =
    typeof cfg?.tenantCode === 'string' && String(cfg.tenantCode).trim()
      ? normalizeTenantSubdomainSlug(String(cfg.tenantCode))
      : '';

  /** Booking slug is not changed via `updateTenant`; set `tenant.subdomain` / `subdomain-config.tenantCode` in the database only. */
  let resolvedSlug: string;
  if (existingSubNorm) {
    resolvedSlug = existingSubNorm;
  } else if (configSlug) {
    resolvedSlug = configSlug;
  } else {
    resolvedSlug = await generateSubdomain(resolvedName);
  }

  await collection.updateOne(
    { _id: tenantId },
    {
      $set: {
        name: resolvedName,
        subdomain: resolvedSlug,
        redirectUrl: resolvedRedirect,
        phone: resolvedPhone,
        email: resolvedEmail,
        shopHours: resolvedShopHours,
        observedHolidayIds: resolvedObservedHolidayIds,
        shopClosedDates: resolvedShopClosedDates,
        recurringScheduleBlocks: resolvedRecurringScheduleBlocks,
        pendingRequestStaleDays: resolvedPendingStaleDays,
        updatedDate: new Date().toLocaleDateString(),
      },
    }
  );

  await db.collection('subdomain-config').updateOne(
    { tenantId },
    {
      $set: {
        tenantId,
        name: resolvedName,
        redirectUrl: resolvedRedirect,
        tenantCode: resolvedSlug,
        updatedDate: new Date().toLocaleDateString(),
        createdDate: new Date().toLocaleDateString(),
      },
    },
    { upsert: true }
  );

  return getTenantById(tenant._id);
};

export const getTenantById = async (_id: string): Promise<Tenant | null> => {
  if (!_id.length) return null;

  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const doc = await collection.findOne({
    _id: new ObjectId(_id),
  });

  if (!doc) return null;

  const cfg = await db.collection('subdomain-config').findOne({ tenantId: doc._id });

  const fromDoc =
    typeof doc.subdomain === 'string' && doc.subdomain.trim()
      ? normalizeTenantSubdomainSlug(doc.subdomain)
      : '';
  const fromCfg =
    typeof cfg?.tenantCode === 'string' && String(cfg.tenantCode).trim()
      ? normalizeTenantSubdomainSlug(String(cfg.tenantCode))
      : '';
  const mergedSubdomain = fromDoc || fromCfg || undefined;

  const tenant: Tenant = {
    ...doc,
    _id: doc._id.toHexString(),
    subdomain: mergedSubdomain,
    shopHours: doc.shopHours || DEFAULT_SHOP_HOURS,
    observedHolidayIds: await filterObservedHolidayIds(doc.observedHolidayIds),
    shopClosedDates: normalizeShopClosedDates(doc.shopClosedDates ?? []),
    recurringScheduleBlocks: normalizeRecurringScheduleBlocks(doc.recurringScheduleBlocks ?? []),
  } as Tenant;

  return tenant;
};

export const getTenantByStripeCustomerId = async (
  stripeCustomerId: string
): Promise<Tenant | null> => {
  if (!stripeCustomerId.length) return null;

  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ stripeCustomerId });
  if (!doc) return null;

  const cfg = await db.collection('subdomain-config').findOne({ tenantId: doc._id });
  const fromDoc =
    typeof doc.subdomain === 'string' && doc.subdomain.trim()
      ? normalizeTenantSubdomainSlug(doc.subdomain)
      : '';
  const fromCfg =
    typeof cfg?.tenantCode === 'string' && String(cfg.tenantCode).trim()
      ? normalizeTenantSubdomainSlug(String(cfg.tenantCode))
      : '';

  const tenant = {
    ...doc,
    _id: doc._id.toHexString(),
    subdomain: fromDoc || fromCfg || undefined,
    shopHours: doc.shopHours || DEFAULT_SHOP_HOURS,
    observedHolidayIds: await filterObservedHolidayIds(doc.observedHolidayIds),
    shopClosedDates: normalizeShopClosedDates(doc.shopClosedDates ?? []),
    recurringScheduleBlocks: normalizeRecurringScheduleBlocks(doc.recurringScheduleBlocks ?? []),
  } as Tenant;

  return tenant;
};

/**
 * Updates Stripe-derived billing fields only (webhooks and checkout completion).
 */
export const updateTenantBilling = async (
  tenantId: string,
  fields: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: string | null;
    trial?: boolean;
  }
): Promise<void> => {
  const db = await getDb();
  const oid = new ObjectId(tenantId);
  const $set: Record<string, unknown> = {
    updatedDate: new Date().toLocaleDateString(),
  };
  const $unset: Record<string, ''> = {};
  if (fields.stripeCustomerId !== undefined) {
    $set.stripeCustomerId = fields.stripeCustomerId;
  }
  if (fields.stripeSubscriptionId !== undefined) {
    $set.stripeSubscriptionId = fields.stripeSubscriptionId;
  }
  if (fields.subscriptionStatus !== undefined) {
    $set.subscriptionStatus = fields.subscriptionStatus;
  }
  if (fields.subscriptionCurrentPeriodEnd !== undefined) {
    if (fields.subscriptionCurrentPeriodEnd === null) {
      $unset.subscriptionCurrentPeriodEnd = '';
    } else {
      $set.subscriptionCurrentPeriodEnd = fields.subscriptionCurrentPeriodEnd;
    }
  }
  if (fields.trial !== undefined) {
    $set.trial = fields.trial;
  }

  const updateDoc: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) {
    updateDoc.$unset = $unset;
  }

  await db.collection(COLLECTION).updateOne({ _id: oid }, updateDoc);
};

/**
 * Global-admin only: billing exemption bypass (not via `POST /update`).
 */
export const updateTenantBillingFlags = async (
  tenantId: string,
  fields: { billingExempt: boolean }
): Promise<void> => {
  if (!tenantId.trim()) return;
  const db = await getDb();
  const oid = new ObjectId(tenantId);
  const now = new Date().toLocaleDateString();
  await db.collection(COLLECTION).updateOne(
    { _id: oid },
    { $set: { updatedDate: now, billingExempt: fields.billingExempt } }
  );
};

/**
 * Global-admin only: assign or clear per-tenant Checkout price id (see `tenantSchema.stripePriceId`).
 * Callers should verify the id with Stripe (`prices.retrieve`) before persisting.
 */
export const updateTenantStripePriceId = async (
  tenantId: string,
  stripePriceId: string | null
): Promise<void> => {
  if (!tenantId.trim()) return;
  const db = await getDb();
  const oid = new ObjectId(tenantId);
  const now = new Date().toLocaleDateString();
  if (stripePriceId == null || !stripePriceId.trim()) {
    await db.collection(COLLECTION).updateOne(
      { _id: oid },
      { $unset: { stripePriceId: '' }, $set: { updatedDate: now } }
    );
    return;
  }
  const trimmed = stripePriceId.trim();
  await db.collection(COLLECTION).updateOne(
    { _id: oid },
    { $set: { stripePriceId: trimmed, updatedDate: now } }
  );
};

/**
 * Generates a unique subdomain based on business name
 */
const generateSubdomain = async (businessName: string): Promise<string> => {
  const db = await getDb();

  // Clean and normalize the business name
  const baseDomain = businessName
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replaceAll(/\s+/g, '-') // Replace spaces with hyphens
    .replaceAll(/-+/g, '-') // Replace multiple hyphens with single
    .replaceAll(/^-|-$/g, ''); // Remove leading/trailing hyphens

  let subdomain = baseDomain;
  let counter = 1;

  // Check for existing subdomains and handle collisions
  while (true) {
    const existing = await db.collection('subdomain-config').findOne({
      tenantCode: subdomain,
    });

    if (!existing) {
      break;
    }

    counter++;
    subdomain = `${baseDomain}-${counter}`;
  }

  return subdomain;
};

/**
 * Picks a Checkout price id for a new tenant: explicit input, then majority among peers.
 * Does not call Stripe APIs (peers are trusted like admin-assigned ids).
 */
async function pickDefaultStripePriceIdForNewTenant(
  db: Db,
  explicitStripePriceId: string | undefined
): Promise<string | undefined> {
  const fromInput = explicitStripePriceId?.trim() ?? '';
  if (fromInput.length > 0) return fromInput;

  const peers = await db
    .collection(COLLECTION)
    .aggregate<{ _id: string; n: number }>([
      {
        $match: {
          stripePriceId: { $type: 'string', $regex: '^price_' },
        },
      },
      { $group: { _id: '$stripePriceId', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 1 },
    ])
    .toArray();

  const fromPeers = peers[0]?._id?.trim();
  if (fromPeers) return fromPeers;

  return undefined;
}

export const createTenant = async (tenant: CreateTenantInput): Promise<ObjectId> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  await ensureHolidaysSeeded();
  const resolvedObservedHolidayIds =
    tenant.observedHolidayIds !== undefined
      ? await filterObservedHolidayIds(tenant.observedHolidayIds)
      : await getDefaultHolidayCodes();

  let subdomain: string;
  if (tenant.subdomain?.trim()) {
    const normalized = normalizeTenantSubdomainSlug(tenant.subdomain);
    const parsed = tenantSubdomainSlugSchema.safeParse(normalized);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid booking URL slug.';
      throw new SubdomainValidationError(msg);
    }
    const taken = await db.collection('subdomain-config').findOne({ tenantCode: parsed.data });
    if (taken) {
      throw new SubdomainTakenError();
    }
    subdomain = parsed.data;
  } else {
    subdomain = await generateSubdomain(tenant.businessName || tenant.name);
  }

  const resolvedStripePriceId = await pickDefaultStripePriceIdForNewTenant(
    db,
    tenant.stripePriceId
  );

  const resolvedActive = tenant.active !== undefined ? tenant.active : true;
  /** App trial starts when the tenant is active; pending signups get `trialEndsAt` on approve. */
  const resolvedTrialEndsAt =
    tenant.trialEndsAt !== undefined
      ? tenant.trialEndsAt
      : resolvedActive
        ? new Date(Date.now() + DEFAULT_APP_TRIAL_DAYS * 864e5).toISOString()
        : undefined;

  // Set default values
  const tenantData = {
    ...tenant,
    name: tenant.name ?? '',
    businessName: tenant.businessName || tenant.name,
    subdomain,
    trial: tenant.trial !== undefined ? tenant.trial : true,
    tier: tenant.tier || 'customer',
    active: resolvedActive,
    trialEndsAt: resolvedTrialEndsAt,
    observedHolidayIds: resolvedObservedHolidayIds,
    shopClosedDates: normalizeShopClosedDates(tenant.shopClosedDates ?? []),
    recurringScheduleBlocks: normalizeRecurringScheduleBlocks(tenant.recurringScheduleBlocks ?? []),
    pendingRequestStaleDays: clampPendingStaleDays(tenant.pendingRequestStaleDays),
    updatedDate: new Date().toLocaleDateString(),
    createdDate: new Date().toLocaleDateString(),
    _id: undefined,
    ...(resolvedStripePriceId ? { stripePriceId: resolvedStripePriceId } : {}),
  };

  const result = await collection.insertOne(tenantData);
  const tenantId = new ObjectId(result.insertedId);

  // Create subdomain configuration
  await db.collection('subdomain-config').updateOne(
    {
      tenantId,
    },
    {
      $set: {
        tenantId,
        name: tenantData.name,
        redirectUrl: tenantData.redirectUrl,
        tenantCode: subdomain,
        createdDate: new Date().toLocaleDateString(),
        updatedDate: new Date().toLocaleDateString(),
      },
    },
    {
      upsert: true,
    }
  );

  return result.insertedId;
};

/**
 * Creates a tenant and associated owner user for public signup
 */
export const createTenantWithOwner = async (
  businessName: string,
  email: string,
  password: string
): Promise<{ tenant: Tenant | null; userId: ObjectId | null }> => {
  const db = await getDb();
  const emailNorm = email.toLowerCase().trim();

  // Check if user with this email already exists
  const existingUser = await db.collection('user').findOne({ email: emailNorm });
  if (existingUser) {
    // Security: Don't reveal that email exists, just return without error
    // The signup endpoint will handle this gracefully with a generic success message
    return { tenant: null, userId: null };
  }

  // Create tenant (inactive by default, requires admin approval)
  const tenantId = await createTenant({
    name: businessName,
    businessName,
    tier: 'customer' as const,
    trial: true,
    email: emailNorm,
    active: false, // New tenants start inactive and require admin approval
    shopHours: DEFAULT_SHOP_HOURS,
  });

  // Get the created tenant
  const tenant = await getTenantById(tenantId.toHexString());
  if (!tenant) {
    throw new Error('Failed to create tenant');
  }

  // Create owner user
  const hashedPassword = await createHash(password);
  const userResult = await db.collection('user').insertOne({
    name: businessName, // Use business name as default user name
    email: emailNorm,
    password: hashedPassword,
    tenantId: tenantId, // Store as ObjectId, not string
    role: 'user',
    active: false, // Will be activated after email verification
    failedAttempts: 0,
    createdDate: new Date().toLocaleDateString(),
    updatedDate: new Date().toLocaleDateString(),
  });

  // Create default technician for immediate app usability
  await db.collection('resources').insertOne({
    name: businessName || 'You',
    email: emailNorm,
    color: 'Blue',
    tenantId: tenantId,
    order: 1,
    createdDate: new Date().toLocaleDateString(),
    updatedDate: new Date().toLocaleDateString(),
  });

  return { tenant, userId: userResult.insertedId };
};

/**
 * Deletes a tenant and all associated data across all collections
 * This is a destructive operation that removes:
 * - Tenant record
 * - Subdomain configuration
 * - All users belonging to the tenant
 * - All resources (technicians)
 * - All appointments
 * - All services (legacy data)
 * - All invites for the tenant
 */
export const deleteTenant = async (tenantId: string): Promise<void> => {
  const db = await getDb();
  const tenantObjectId = new ObjectId(tenantId);

  const tenantUsers = await db
    .collection('user')
    .find({ tenantId: tenantObjectId })
    .project({ _id: 1 })
    .toArray();
  const tenantUserIds = tenantUsers.map(u => u._id as ObjectId);
  await deletePasswordResetsForUserIds(tenantUserIds);

  // Delete from all collections that reference this tenant
  const deleteOperations = [
    // Delete appointments (tenantId stored as string)
    db.collection('appointments').deleteMany({ tenantId }),

    // Delete resources/technicians (tenantId stored as ObjectId)
    db.collection('resources').deleteMany({ tenantId: tenantObjectId }),

    // Delete services (legacy data, tenantId stored as ObjectId)
    db.collection('services').deleteMany({ tenantId: tenantObjectId }),

    // Delete users (tenantId stored as ObjectId)
    db.collection('user').deleteMany({ tenantId: tenantObjectId }),

    // Delete invites that reference this tenant (if any)
    db.collection('invites').deleteMany({ tenantId: tenantObjectId }),

    // Delete subdomain configuration
    db.collection('subdomain-config').deleteMany({ tenantId: tenantObjectId }),

    // Finally, delete the tenant record itself
    db.collection(COLLECTION).deleteOne({ _id: tenantObjectId }),
  ];

  // Execute all deletions
  await Promise.all(deleteOperations);
};

/**
 * Approves (activates) a tenant, allowing their users to log in
 * This also sends verification emails to all users of this tenant
 * This is used for the admin approval process for new signups
 */
export const approveTenant = async (tenantId: string): Promise<Tenant | null> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const tenantObjectId = new ObjectId(tenantId);

  // First, verify the tenant exists and get it
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return null;
  }

  const nowLabel = new Date().toLocaleDateString();
  const trialEndsAt =
    tenant.trialEndsAt?.trim() ||
    new Date(Date.now() + DEFAULT_APP_TRIAL_DAYS * 864e5).toISOString();

  // Update tenant to active; start app trial clock on first approval if not set
  const result = await collection.updateOne(
    { _id: tenantObjectId },
    {
      $set: {
        active: true,
        updatedDate: nowLabel,
        ...(!tenant.trialEndsAt?.trim() ? { trialEndsAt } : {}),
      },
    }
  );

  if (result.matchedCount === 0) {
    return null; // Tenant not found
  }

  // Get all users for this tenant and send verification emails
  console.log('approveTenant - Finding users for tenant:', tenantId);
  const users = await db
    .collection('user')
    .find({
      tenantId: tenantObjectId,
      active: false, // Only send emails to inactive users
    })
    .toArray();

  console.log('approveTenant - Found inactive users:', users.length);

  // Send verification emails to all inactive users
  for (const user of users) {
    try {
      console.log('approveTenant - Sending verification email to:', user.email);
      await inviteUser({
        _id: user._id.toHexString(),
        name: user.name,
        email: user.email,
        password: user.password, // Won't be used in invite
        tenantId: tenantId,
      });
      console.log('approveTenant - Verification email sent to:', user.email);
    } catch (error) {
      console.error('approveTenant - Failed to send email to:', user.email, error);
    }
  }

  // Return the updated tenant
  return await getTenantById(tenantId);
};

/**
 * Migration function to add default shopHours to existing tenants
 * that don't have this field. This should be run once after deployment.
 */
export const migrateTenantShopHours = async (): Promise<void> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  // Find all tenants that don't have shopHours field
  const tenantsWithoutShopHours = await collection
    .find({
      shopHours: { $exists: false },
    })
    .toArray();

  console.log(`Found ${tenantsWithoutShopHours.length} tenants without shopHours`);

  // Update each tenant with default shop hours
  for (const tenant of tenantsWithoutShopHours) {
    await collection.updateOne(
      { _id: tenant._id },
      {
        $set: {
          shopHours: DEFAULT_SHOP_HOURS,
          updatedDate: new Date().toLocaleDateString(),
        },
      }
    );
    console.log(`Updated tenant ${tenant.name} with default shop hours`);
  }

  console.log('Migration completed');
};

/**
 * One-time (or rare) backfill: set `trialEndsAt` to now + {@link DEFAULT_APP_TRIAL_DAYS} for every
 * tenant that does not have it, so existing workspaces get a visible trial window on billing UI.
 * Idempotent for tenants that already have `trialEndsAt` set.
 */
export async function backfillMissingTenantTrialEndsAt(): Promise<{
  matchedCount: number;
  modifiedCount: number;
}> {
  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const iso = new Date(Date.now() + DEFAULT_APP_TRIAL_DAYS * 864e5).toISOString();
  const nowLabel = new Date().toLocaleDateString();

  const filter = {
    $or: [
      { trialEndsAt: { $exists: false } },
      { trialEndsAt: null },
      { trialEndsAt: '' },
    ],
  };

  const result = await collection.updateMany(filter, {
    $set: {
      trialEndsAt: iso,
      updatedDate: nowLabel,
    },
  });

  console.log(
    `[tenant] backfillMissingTenantTrialEndsAt: matched ${result.matchedCount}, modified ${result.modifiedCount}, trialEndsAt=${iso}`
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}
