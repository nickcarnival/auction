import { DEFAULT_HOLIDAY_SEEDS } from './default-holiday-seeds';

const LABEL_BY_CODE: Record<string, string> = Object.fromEntries(
  DEFAULT_HOLIDAY_SEEDS.map(s => [s.code, s.label])
);

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `weekday`: 0 = Sunday … 6 = Saturday. `nth`: 1 = first occurrence in month. */
function nthWeekdayOfMonth(year: number, monthIndex0: number, weekday: number, nth: number): Date {
  let seen = 0;
  for (let dayNum = 1; dayNum <= 31; dayNum++) {
    const d = new Date(year, monthIndex0, dayNum);
    if (d.getMonth() !== monthIndex0) break;
    if (d.getDay() === weekday) {
      seen += 1;
      if (seen === nth) return d;
    }
  }
  throw new Error(`No weekday ${weekday} #${nth} in month ${monthIndex0 + 1}/${year}`);
}

function lastWeekdayOfMonth(year: number, monthIndex0: number, weekday: number): Date {
  const lastDayNum = new Date(year, monthIndex0 + 1, 0).getDate();
  for (let dayNum = lastDayNum; dayNum >= 1; dayNum--) {
    const d = new Date(year, monthIndex0, dayNum);
    if (d.getDay() === weekday) return d;
  }
  throw new Error(`No last weekday ${weekday} in month ${monthIndex0 + 1}/${year}`);
}

/**
 * Calendar date (local) for a US federal holiday `code` in `year`.
 * Unknown or unsupported codes return `null`.
 */
export function getUsFederalHolidayDateKey(code: string, year: number): string | null {
  try {
    switch (code) {
      case 'us-new-years-day':
        return localYmd(new Date(year, 0, 1));
      case 'us-martin-luther-king-jr':
        return localYmd(nthWeekdayOfMonth(year, 0, 1, 3));
      case 'us-presidents-day':
        return localYmd(nthWeekdayOfMonth(year, 1, 1, 3));
      case 'us-memorial-day':
        return localYmd(lastWeekdayOfMonth(year, 4, 1));
      case 'us-juneteenth':
        return localYmd(new Date(year, 5, 19));
      case 'us-independence-day':
        return localYmd(new Date(year, 6, 4));
      case 'us-labor-day':
        return localYmd(nthWeekdayOfMonth(year, 8, 1, 1));
      case 'us-columbus-day':
        return localYmd(nthWeekdayOfMonth(year, 9, 1, 2));
      case 'us-veterans-day':
        return localYmd(new Date(year, 10, 11));
      case 'us-thanksgiving':
        return localYmd(nthWeekdayOfMonth(year, 10, 4, 4));
      case 'us-christmas':
        return localYmd(new Date(year, 11, 25));
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export type TenantHolidayDayInfo = { code: string; label: string };

/**
 * Maps `YYYY-MM-DD` (local) → holiday info for tenant-observed US federal holidays.
 */
export function buildTenantHolidayDayMap(
  observedCodes: readonly string[],
  years: readonly number[]
): Map<string, TenantHolidayDayInfo> {
  const map = new Map<string, TenantHolidayDayInfo>();
  const codes = new Set(observedCodes);
  for (const year of years) {
    for (const code of codes) {
      const key = getUsFederalHolidayDateKey(code, year);
      if (!key) continue;
      const label = LABEL_BY_CODE[code] ?? code;
      map.set(key, { code, label });
    }
  }
  return map;
}
