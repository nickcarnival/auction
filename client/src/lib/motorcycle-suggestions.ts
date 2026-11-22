import { harleyDavidsonMotorcyclesByYear } from './harley-davidson-motorcycles-by-year';

/** Cap dropdown size for performance and readability */
export const MOTORCYCLE_SUGGESTIONS_MAX = 40;

/**
 * Returns display strings `{year} {model}` from the curated Harley list that match `rawQuery`
 * (substring, case-insensitive). Earlier / shorter labels rank slightly higher when scores tie.
 */
export function filterMotorcycleSuggestions(rawQuery: string): string[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    return [];
  }

  const scored: { label: string; score: number }[] = [];

  for (const e of harleyDavidsonMotorcyclesByYear.entries) {
    const label = `${e.year} ${e.model}`;
    const lower = label.toLowerCase();
    if (!lower.includes(q)) continue;

    let score = 0;
    if (lower.startsWith(q)) score += 100;
    const idx = lower.indexOf(q);
    if (idx !== -1) score += Math.max(0, 40 - idx);

    scored.push({ label, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });

  return scored.slice(0, MOTORCYCLE_SUGGESTIONS_MAX).map(s => s.label);
}
