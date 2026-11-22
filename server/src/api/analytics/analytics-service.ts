import { getDb } from '@/db';
import {
  trackUserEventBodySchema,
  type UserEventMetadata,
  type TrackUserEventBody,
  type UserEventTenantSummary,
  userEventMetadataSchema,
} from '@shared/schemas/user-event-schema';
import { ObjectId } from 'mongodb';

const COLLECTION = 'user_events';

export type UserEventRow = {
  _id: string;
  tenantId: string;
  userId: string;
  action: string;
  metadata?: UserEventMetadata;
  createdAt: string;
};

let indexesEnsured = false;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  const c = db.collection(COLLECTION);
  await c.createIndex({ tenantId: 1, createdAt: -1 });
  await c.createIndex({ createdAt: -1 });
  indexesEnsured = true;
}

function compactMetadata(meta: UserEventMetadata | undefined): UserEventMetadata | undefined {
  if (meta === undefined) return undefined;
  const normalized = userEventMetadataSchema.parse(meta);
  const hasValue = Object.values(normalized).some(v => v !== undefined);
  return hasValue ? normalized : undefined;
}

export async function recordUserEvent(
  tenantId: string,
  userId: string,
  body: TrackUserEventBody
): Promise<void> {
  const parsed = trackUserEventBodySchema.safeParse(body);
  if (!parsed.success) {
    console.error('[analytics] invalid event body', parsed.error.flatten());
    throw new Error('invalid_user_event');
  }

  await ensureIndexes();
  const db = await getDb();
  const metadata = compactMetadata(parsed.data.metadata);
  const doc = {
    tenantId,
    userId,
    action: parsed.data.action,
    ...(metadata !== undefined ? { metadata } : {}),
    createdAt: new Date(),
  };
  await db.collection(COLLECTION).insertOne(doc);
}

export async function listUserEventsForAdmin(options: {
  limit: number;
  tenantId?: string;
}): Promise<UserEventRow[]> {
  await ensureIndexes();
  const db = await getDb();
  const cursor = db
    .collection(COLLECTION)
    .find(options.tenantId ? { tenantId: options.tenantId } : {})
    .sort({ createdAt: -1 })
    .limit(options.limit);

  const docs = await cursor.toArray();
  return docs.map(d => ({
    _id: d._id instanceof ObjectId ? d._id.toHexString() : String(d._id),
    tenantId: String(d.tenantId),
    userId: String(d.userId),
    action: String(d.action),
    ...((): { metadata?: UserEventMetadata } => {
      if (typeof d.metadata !== 'object' || d.metadata === null || Array.isArray(d.metadata)) {
        return {};
      }
      const m = userEventMetadataSchema.safeParse(d.metadata);
      if (!m.success) return {};
      const hasValue = Object.values(m.data).some(v => v !== undefined);
      return hasValue ? { metadata: m.data } : {};
    })(),
    createdAt:
      d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(String(d.createdAt)).toISOString(),
  }));
}

/** Aggregate event counts by `action` for a single tenant (admin dashboards). */
export async function getUserEventSummaryForTenant(tenantId: string): Promise<UserEventTenantSummary> {
  await ensureIndexes();
  const db = await getDb();
  const rows = await db
    .collection(COLLECTION)
    .aggregate<{ _id: string; count: number }>([
      { $match: { tenantId } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
    ])
    .toArray();

  const byAction: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const action = String(row._id);
    const count = Number(row.count);
    byAction[action] = count;
    total += count;
  }
  return { total, byAction };
}
