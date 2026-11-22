import { harleyDavidsonMotorcyclesByYear } from './harley-davidson-motorcycles-by-year';

const list = harleyDavidsonMotorcyclesByYear.entries.filter((e) => e.year > 2005);

const FALLBACK = 'e.g. 2020 FLHR Road King';

/**
 * Returns a fresh random {year, model} from the curated post-2005 list (e.g. for input
 * placeholders). Call on focus so each time the user “opens” the field they get a new example.
 */
export function getMotorcycleYearModelPlaceholder(): string {
  if (list.length === 0) {
    return FALLBACK;
  }
  const pick = list[Math.floor(Math.random() * list.length)]!;
  return `e.g. ${pick.year} ${pick.model}`;
}
