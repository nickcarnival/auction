import { getDb } from '@/db';
import { DEFAULT_HOLIDAY_SEEDS } from '@shared/holidays/default-holiday-seeds';
import type { HolidayListItem } from '@shared/holidays/holiday';

const COLLECTION = 'holidays';

let seedPromise: Promise<void> | null = null;

async function runHolidaySeed(): Promise<void> {
  const db = await getDb();
  const coll = db.collection(COLLECTION);
  const now = new Date().toLocaleDateString();

  for (const row of DEFAULT_HOLIDAY_SEEDS) {
    await coll.updateOne(
      { code: row.code },
      {
        $set: {
          label: row.label,
          typicalTiming: row.typicalTiming,
          sortOrder: row.sortOrder,
          isDefault: row.isDefault,
          updatedDate: now,
        },
        $setOnInsert: {
          createdDate: now,
        },
      },
      { upsert: true }
    );
  }
}

/**
 * Upserts seed holidays once per process (first caller), then no-ops. Re-run after deploy
 * restarts so labels / defaults stay in sync with `DEFAULT_HOLIDAY_SEEDS`.
 */
export function ensureHolidaysSeeded(): Promise<void> {
  seedPromise ??= runHolidaySeed();
  return seedPromise;
}

export async function listHolidaysForClient(): Promise<HolidayListItem[]> {
  await ensureHolidaysSeeded();
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ sortOrder: 1 })
    .toArray();

  return docs.map(doc => ({
    _id: doc._id.toHexString(),
    code: doc.code as string,
    label: doc.label as string,
    typicalTiming: doc.typicalTiming as string,
    sortOrder: doc.sortOrder as number,
    isDefault: Boolean(doc.isDefault),
  }));
}

async function getValidHolidayCodes(): Promise<Set<string>> {
  await ensureHolidaysSeeded();
  const db = await getDb();
  const docs = await db.collection(COLLECTION).find({}, { projection: { code: 1 } }).toArray();
  return new Set(docs.map(d => d.code as string));
}

/** Holiday `code` values marked `isDefault` in the collection (for new tenants). */
export async function getDefaultHolidayCodes(): Promise<string[]> {
  await ensureHolidaysSeeded();
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ isDefault: true }, { projection: { code: 1 } })
    .sort({ sortOrder: 1 })
    .toArray();
  return docs.map(d => d.code as string);
}

/** Keeps only ids that exist in `holidays`. */
export async function filterObservedHolidayIds(raw: unknown): Promise<string[]> {
  if (!Array.isArray(raw)) return [];
  const codes = await getValidHolidayCodes();
  const strings = raw.filter((id): id is string => typeof id === 'string');
  return strings.filter(id => id.length > 0 && codes.has(id));
}
