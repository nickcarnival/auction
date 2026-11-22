import type { CustomerWithStats } from './customer';
import { normalizeCustomerNameForMatch } from './customer-name-utils';
import { normalizeEmailForLookup } from './email-utils';
import { normalizePhoneForLookup } from './phone-utils';

function customerRowHasUsableEmail(c: CustomerWithStats): boolean {
  const raw = typeof c.email === 'string' ? c.email : '';
  return normalizeEmailForLookup(raw) != null;
}

function customerRowHasUsablePhone(c: CustomerWithStats): boolean {
  const raw = typeof c.phone === 'string' ? c.phone : '';
  return normalizePhoneForLookup(raw) != null;
}

/** Every profile in the group has no normalizable email (treat as aligned empty email). */
function mergeGroupAllCustomersLackEmail(group: CustomerMergeSuggestionGroup): boolean {
  return group.customers.length > 0 && group.customers.every(c => !customerRowHasUsableEmail(c));
}

/** Every profile in the group has no normalizable phone (treat as aligned empty phone). */
function mergeGroupAllCustomersLackPhone(group: CustomerMergeSuggestionGroup): boolean {
  return group.customers.length > 0 && group.customers.every(c => !customerRowHasUsablePhone(c));
}

/** How rows were linked into this duplicate group (composites = stronger agreement). */
export type MergeMatchReason =
  | 'phone'
  | 'email'
  | 'name'
  | 'phone_email'
  | 'phone_name'
  | 'email_name'
  /** Same words after punctuation strip + token sort (“John Smith” / “Smith, John”). */
  | 'name_collated'
  /** Same person, likely typo / extra characters in the display name (fuzzy). */
  | 'name_fuzzy'
  /** One display name’s letters/digits are a substring of the other (e.g. “Testing” in “Testing Things”). */
  | 'name_contains'
  /** Shared substring / containment / typo bucket (server may emit instead of separate fuzzy+contains). */
  | 'name_similar'
  /** User picked profiles from the customer list (not from duplicate detection). */
  | 'manual';

export type CustomerMergeSuggestionGroup = {
  reasons: MergeMatchReason[];
  /** Internal / debug: normalized keys or composite keys (unit separator between parts). */
  keys: string[];
  customers: CustomerWithStats[];
  /** 0–100: higher when stronger or multiple independent signals agree. */
  confidenceScore: number;
};

/**
 * For each customer id appearing in any merge group, the number of distinct other customers that
 * share at least one suggested group with them (potential duplicates to review).
 */
export function duplicateNeighborCountByCustomerId(
  groups: CustomerMergeSuggestionGroup[]
): Map<string, number> {
  const neighbors = new Map<string, Set<string>>();
  for (const g of groups) {
    const ids = g.customers
      .map(c => c._id?.trim())
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    for (const id of ids) {
      let set = neighbors.get(id);
      if (!set) {
        set = new Set();
        neighbors.set(id, set);
      }
      for (const other of ids) {
        if (other !== id) set.add(other);
      }
    }
  }
  return new Map([...neighbors.entries()].map(([id, set]) => [id, set.size]));
}

/**
 * Derives a display score from the union of signals on this group (used server-side; safe to reuse
 * client-side for older API responses missing `confidenceScore`).
 */
export function confidenceFromMergeReasons(reasons: MergeMatchReason[]): number {
  const set = new Set(reasons);
  let base = 0;
  if (set.has('phone_email')) base = Math.max(base, 96);
  if (set.has('phone_name')) base = Math.max(base, 90);
  if (set.has('email_name')) base = Math.max(base, 88);
  if (set.has('phone')) base = Math.max(base, 74);
  if (set.has('email')) base = Math.max(base, 68);
  if (set.has('name_collated')) base = Math.max(base, 46);
  if (set.has('name_contains')) base = Math.max(base, 44);
  if (set.has('name_similar')) base = Math.max(base, 44);
  if (set.has('name')) base = Math.max(base, 38);
  if (set.has('name_fuzzy')) base = Math.max(base, 36);
  const signalVariety = set.size;
  const bonus = signalVariety >= 2 ? Math.min(12, 4 + (signalVariety - 2) * 4) : 0;
  return Math.min(100, base + bonus);
}

/**
 * Drops standalone signals that are already implied by a composite (e.g. hide "Same phone" when
 * "Same phone + email" is present) so badges are not redundant.
 */
export function mergeReasonsForDisplay(reasons: MergeMatchReason[]): MergeMatchReason[] {
  const set = new Set(reasons);
  const drop = new Set<MergeMatchReason>();

  if (set.has('phone_email')) {
    drop.add('phone');
    drop.add('email');
  }
  if (set.has('phone_name')) {
    drop.add('phone');
    drop.add('name');
  }
  if (set.has('email_name')) {
    drop.add('email');
    drop.add('name');
  }

  const seen = new Set<MergeMatchReason>();
  const out: MergeMatchReason[] = [];
  for (const r of reasons) {
    if (drop.has(r)) continue;
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}

/** User-facing duplicate badges: one chip per signal type (composites expand to several). */
export type MergeSimpleBadge = 'phone' | 'email' | 'name' | 'similar_name' | 'manual';

const MERGE_SIMPLE_BADGE_ORDER: MergeSimpleBadge[] = [
  'manual',
  'phone',
  'email',
  'name',
  'similar_name',
];

/**
 * Maps raw merge reasons to a short list of badge keys — e.g. `phone_email` → phone + email;
 * `name_fuzzy` / `name_similar` → similar name only.
 */
export function mergeReasonsForSimpleBadges(reasons: MergeMatchReason[]): MergeSimpleBadge[] {
  const set = new Set<MergeSimpleBadge>();
  for (const r of reasons) {
    if (r === 'manual') set.add('manual');
    if (r === 'phone' || r === 'phone_email' || r === 'phone_name') set.add('phone');
    if (r === 'email' || r === 'phone_email' || r === 'email_name') set.add('email');
    if (r === 'name' || r === 'phone_name' || r === 'email_name' || r === 'name_collated') {
      set.add('name');
    }
    if (r === 'name_contains' || r === 'name_fuzzy' || r === 'name_similar') {
      set.add('similar_name');
    }
  }
  return MERGE_SIMPLE_BADGE_ORDER.filter(b => set.has(b));
}

export function mergeSimpleBadgeLabel(badge: MergeSimpleBadge): string {
  switch (badge) {
    case 'manual':
      return 'Manual selection';
    case 'phone':
      return 'Same phone';
    case 'email':
      return 'Same email';
    case 'name':
      return 'Same name';
    case 'similar_name':
      return 'Similar name';
  }
}

/**
 * Builds a merge-suggestion-shaped group from profiles chosen on the customer list so the same
 * merge UI (keep / field pickers / API) can run without a server duplicate suggestion.
 */
export function buildManualMergeGroup(customers: CustomerWithStats[]): CustomerMergeSuggestionGroup {
  const withIds = customers.filter((c): c is CustomerWithStats & { _id: string } =>
    Boolean(c._id?.trim())
  );
  const sorted = [...withIds].sort((a, b) => b.appointmentCount - a.appointmentCount);
  return {
    reasons: ['manual'],
    keys: [],
    customers: sorted,
    confidenceScore: 0,
  };
}

/** POST `/api/customers/merge` body for one-click merge when every profile matches on normalized contact triple. */
export type InstantUnambiguousMergePayload = {
  keepCustomerId: string;
  mergeCustomerIds: string[];
  profile: { name: string; email: string; phone: string };
};

function contactTripletFingerprints(c: CustomerWithStats): {
  nameKey: string;
  phoneKey: string | null;
  emailKey: string | null;
} {
  const phoneRaw = typeof c.phone === 'string' ? c.phone : '';
  const emailRaw = typeof c.email === 'string' ? c.email : '';
  return {
    nameKey: normalizeCustomerNameForMatch(c.name),
    phoneKey: normalizePhoneForLookup(phoneRaw),
    emailKey: normalizeEmailForLookup(emailRaw),
  };
}

/**
 * Every profile shares the same case-insensitive name, same normalized phone (or all missing), and
 * same normalized email (or all missing). Manual-selection groups never qualify.
 */
export function customersEligibleForInstantUnambiguousMerge(
  customers: CustomerWithStats[],
  reasons: MergeMatchReason[]
): boolean {
  if (mergeReasonsForSimpleBadges(reasons).includes('manual')) return false;

  const withIds = customers.filter((c): c is CustomerWithStats & { _id: string } =>
    Boolean(c._id?.trim())
  );
  if (withIds.length < 2) return false;

  const fp0 = contactTripletFingerprints(withIds[0]);
  if (fp0.nameKey.length === 0) return false;

  for (let i = 1; i < withIds.length; i++) {
    const fp = contactTripletFingerprints(withIds[i]);
    if (fp.nameKey !== fp0.nameKey || fp.phoneKey !== fp0.phoneKey || fp.emailKey !== fp0.emailKey) {
      return false;
    }
  }
  return true;
}

export function mergeGroupEligibleForInstantUnambiguousMerge(
  group: CustomerMergeSuggestionGroup
): boolean {
  return customersEligibleForInstantUnambiguousMerge(group.customers, group.reasons);
}

/**
 * Keeper first by appointment count (then name). Saved name is uppercase; email canonical lowercase;
 * phone is the keeper’s raw string (unchanged formatting when nonempty).
 */
export function buildInstantUnambiguousMergePayload(
  customers: CustomerWithStats[],
  reasons: MergeMatchReason[]
): InstantUnambiguousMergePayload | null {
  if (!customersEligibleForInstantUnambiguousMerge(customers, reasons)) return null;

  const withIds = customers.filter((c): c is CustomerWithStats & { _id: string } =>
    Boolean(c._id?.trim())
  );
  const sorted = [...withIds].sort((a, b) => {
    const ac = a.appointmentCount ?? 0;
    const bc = b.appointmentCount ?? 0;
    if (bc !== ac) return bc - ac;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

  const keeper = sorted[0];
  const nameKey = normalizeCustomerNameForMatch(keeper.name);
  const nameForApi = nameKey.toUpperCase();
  const emailKey = normalizeEmailForLookup(typeof keeper.email === 'string' ? keeper.email : '');
  const emailForApi = emailKey ?? '';
  const phoneNorm = normalizePhoneForLookup(typeof keeper.phone === 'string' ? keeper.phone : '');
  const phoneForApi = phoneNorm != null ? (keeper.phone ?? '').trim() : '';

  return {
    keepCustomerId: keeper._id,
    mergeCustomerIds: sorted.slice(1).map(c => c._id),
    profile: {
      name: nameForApi,
      email: emailForApi,
      phone: phoneForApi,
    },
  };
}

export function buildInstantUnambiguousMergePayloadForGroup(
  group: CustomerMergeSuggestionGroup
): InstantUnambiguousMergePayload | null {
  return buildInstantUnambiguousMergePayload(group.customers, group.reasons);
}

/** Subset of duplicate signals used for list filters and “open next merge” shortcuts. */
export type MergeQuickFilter = 'phone' | 'email' | 'name' | 'similar' | 'triple';

export function mergeGroupMatchesQuickFilter(
  group: CustomerMergeSuggestionGroup,
  filter: MergeQuickFilter
): boolean {
  const badges = mergeReasonsForSimpleBadges(group.reasons);
  if (filter === 'triple') {
    if (badges.includes('manual')) return false;
    const hasPhone = badges.includes('phone');
    const hasEmail = badges.includes('email');
    const hasName = badges.includes('name');
    const strictTriple = hasPhone && hasEmail && hasName;
    /** Same phone + same name with no email on any profile, or same email + same name with no phone. */
    const phoneNameBothBlankEmail =
      hasPhone && hasName && mergeGroupAllCustomersLackEmail(group);
    const emailNameBothBlankPhone =
      hasEmail && hasName && mergeGroupAllCustomersLackPhone(group);
    return strictTriple || phoneNameBothBlankEmail || emailNameBothBlankPhone;
  }
  if (filter === 'phone') return badges.includes('phone');
  if (filter === 'email') return badges.includes('email');
  if (filter === 'name') return badges.includes('name');
  return badges.includes('similar_name');
}

/**
 * Canonical merge-route customer id for a group (`customers[0]` is highest appointment count from
 * the server).
 */
export function groupMergeFocusCustomerId(group: CustomerMergeSuggestionGroup): string | null {
  const id = group.customers[0]?._id?.trim();
  return id || null;
}

export function findFirstGroupFocusIdForQuickFilter(
  suggestions: CustomerMergeSuggestionGroup[],
  filter: MergeQuickFilter
): string | null {
  const g = suggestions.find(gr => mergeGroupMatchesQuickFilter(gr, filter));
  return g ? groupMergeFocusCustomerId(g) : null;
}
