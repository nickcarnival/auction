import { z } from 'zod';
import {
  buildTenantHolidayDayMap,
  getUsFederalHolidayDateKey,
} from './us-federal-holiday-dates';

export const shopClosedDateEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(120).optional(),
});

export type ShopClosedDateEntry = z.infer<typeof shopClosedDateEntrySchema>;

export const shopClosedDatesSchema = z.array(shopClosedDateEntrySchema).max(500);

/**
 * Dedupe by date (first row wins), trim notes, drop invalid or blank dates (safe for form + DB).
 */
export function normalizeShopClosedDates(raw: unknown): ShopClosedDateEntry[] {
  if (!Array.isArray(raw) || raw.length > 500) return [];
  const byDate = new Map<string, ShopClosedDateEntry>();
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const rec = item as { date?: unknown; note?: unknown };
    const dateStr = typeof rec.date === 'string' ? rec.date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    const noteStr = typeof rec.note === 'string' ? rec.note.trim().slice(0, 120) : '';
    const note = noteStr.length > 0 ? noteStr : undefined;
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, note != null ? { date: dateStr, note } : { date: dateStr });
    }
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v);
}

export type TenantClosedDayDisplay = { label: string; federalCode?: string };

export function buildTenantClosedDayMap(
  observedCodes: readonly string[],
  customEntries: readonly ShopClosedDateEntry[],
  years: readonly number[]
): Map<string, TenantClosedDayDisplay> {
  const map = new Map<string, TenantClosedDayDisplay>();
  for (const [key, { code, label }] of buildTenantHolidayDayMap(observedCodes, years)) {
    map.set(key, { label, federalCode: code });
  }
  for (const e of customEntries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const label =
      e.note != null && e.note.trim() ? e.note.trim() : 'Shop closed';
    map.set(e.date, { label });
  }
  return map;
}

export function buildTenantClosedLocalDateSet(
  observedCodes: readonly string[],
  customEntries: readonly ShopClosedDateEntry[],
  years: readonly number[]
): Set<string> {
  const keys = new Set<string>();
  for (const year of years) {
    for (const code of observedCodes) {
      const k = getUsFederalHolidayDateKey(code, year);
      if (k) keys.add(k);
    }
  }
  for (const e of customEntries) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) keys.add(e.date);
  }
  return keys;
}

/** Inclusive year span around anchor dates for holiday rules that vary by calendar year. */
export function closedDateYearsForAnchors(anchors: readonly Date[], padding = 2): number[] {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const d of anchors) {
    const y = d.getFullYear();
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    const y = new Date().getFullYear();
    minY = y;
    maxY = y;
  }
  const out: number[] = [];
  for (let y = minY - padding; y <= maxY + padding; y++) {
    out.push(y);
  }
  return out;
}
