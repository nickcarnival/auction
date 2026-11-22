/**
 * Trims, collapses internal whitespace, uppercases — canonical stored/display form for customer
 * names (DB, appointments, search comparison).
 */
export function normalizeCustomerStoredName(name: string | null | undefined): string {
  if (name == null || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Client-only: uppercase + collapse internal whitespace **without** trimming ends so spaces between
 * words can be typed. Matches what users see while editing; {@link normalizeCustomerStoredName} on
 * the server is still authoritative on save.
 */
export function normalizeCustomerNameWhileTyping(name: string): string {
  return name.replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Same normalization as {@link normalizeCustomerStoredName}. Used for case-/space-insensitive name
 * equality (linking customers ↔ appointments/requests). No minimum length — unlike
 * {@link normalizeCustomerNameForLookup}.
 */
export function normalizeCustomerNameForMatch(name: string | null | undefined): string {
  return normalizeCustomerStoredName(name);
}

/**
 * Canonical form for spotting duplicate display names (merge suggestions).
 * Trims, uppercases, collapses internal whitespace. Returns null if too short (noise / initials).
 */
export function normalizeCustomerNameForLookup(name: string | null | undefined): string | null {
  if (name == null || typeof name !== 'string') return null;
  const collapsed = normalizeCustomerStoredName(name);
  return collapsed.length >= 3 ? collapsed : null;
}

/**
 * Lowercase alphanumerics only, for fuzzy “same person, typo/extra char” checks.
 * Returns null if there are too few letters/digits to compare safely.
 */
export function compactCustomerNameForFuzzy(name: string | null | undefined): string | null {
  if (name == null || typeof name !== 'string') return null;
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return s.length >= 4 ? s : null;
}

/**
 * Token sort key: strips punctuation, splits words, ignores 1-char noise, sorts tokens.
 * Aligns “Smith, John”, “John Smith”, “john  smith!” so they share one merge bucket.
 */
export function normalizeCustomerNameSortedTokens(name: string | null | undefined): string | null {
  if (name == null || typeof name !== 'string') return null;
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const meaningful = tokens.filter(t => t.length >= 2);
  const use = meaningful.length > 0 ? meaningful : tokens;
  if (use.join('').length < 3) return null;
  use.sort();
  return use.join(' ');
}

/** Levenshtein distance (for short ASCII compacts). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  const row = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a.codePointAt(i - 1) === b.codePointAt(j - 1) ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * True when two display names are likely the same person with spelling / extra-symbol drift
 * (not a generic fuzzy name match across unrelated people).
 */
export function customerDisplayNamesProbablyTypoVariant(a: string, b: string): boolean {
  const ca = compactCustomerNameForFuzzy(a);
  const cb = compactCustomerNameForFuzzy(b);
  if (!ca || !cb || ca === cb) return false;
  const maxLen = Math.max(ca.length, cb.length);
  if (maxLen < 5) return false;
  if (Math.abs(ca.length - cb.length) > Math.max(2, Math.floor(maxLen * 0.22))) return false;
  const dist = levenshteinDistance(ca, cb);
  if (maxLen <= 12) return dist <= 2;
  const ratio = 1 - dist / maxLen;
  return ratio >= 0.88;
}

/**
 * True when one display name’s compact form (letters/digits only) appears inside the other’s.
 * E.g. “Testing” vs “Testing Things 2” → shorter `testing` ⊆ longer `testingthings2`.
 * Shorter side must be at least 4 characters to avoid noisy hits.
 */
export function customerDisplayNamesOneContainsTheOther(a: string, b: string): boolean {
  const ca = compactCustomerNameForFuzzy(a);
  const cb = compactCustomerNameForFuzzy(b);
  if (!ca || !cb || ca === cb) return false;
  const short = ca.length <= cb.length ? ca : cb;
  const long = ca.length <= cb.length ? cb : ca;
  if (short.length < 4) return false;
  return long.includes(short);
}

/** Minimum length for “meaningful” token / substring overlap in {@link customerDisplayNamesSimpleMatch}. */
export const SIMPLE_NAME_MATCH_MIN_LEN = 4;

function stripAlnumOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeWordTokens(s: string): string[] {
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

function isWordListPrefix(shorter: string[], longer: string[]): boolean {
  if (shorter.length > longer.length) return false;
  for (const [i, word] of shorter.entries()) {
    if (word !== longer[i]) return false;
  }
  return true;
}

/** Blocks `no test` ↔ `test`: alphabetic word directly before the same token (e.g. `no`). */
function isAlphabeticWord2Plus(t: string): boolean {
  return /^[a-z]{2,}$/i.test(t);
}

/**
 * One side is a single word `w` (e.g. `test`), the other multi-word. Match if `w` is a whole token
 * in the longer name and the token before it is not a 2+ letter word (so `1 test 2` still matches `test`).
 */
function singleWordMatchesMultiWord(shorterOneWord: string, longerWords: string[]): boolean {
  if (shorterOneWord.length < SIMPLE_NAME_MATCH_MIN_LEN) return false;
  for (let i = 0; i < longerWords.length; i++) {
    if (longerWords[i] !== shorterOneWord) continue;
    if (i === 0) return true;
    const prev = longerWords[i - 1];
    if (isAlphabeticWord2Plus(prev)) return false;
    return true;
  }
  return false;
}

function compactWordToken(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Multi-word vs single-word: any “eligible” token (not after a 2+ letter alphabetic word) pair-matches
 * the single (`1 test 2` ↔ `testing` via `test`; `no test` ↔ `testing` skips `test` because of `no`).
 */
function multiWordVsSingleWordPair(longerWords: string[], singleWord: string): boolean {
  if (singleWord.length < SIMPLE_NAME_MATCH_MIN_LEN) return false;
  for (let i = 0; i < longerWords.length; i++) {
    const t = longerWords[i];
    if (t.length < SIMPLE_NAME_MATCH_MIN_LEN) continue;
    if (i > 0 && isAlphabeticWord2Plus(longerWords[i - 1])) continue;
    if (singleWordPairMatch(t, singleWord)) return true;
  }
  return false;
}

/**
 * Same number of words on each side (e.g. `Test Customer` vs `Testing Customer`):
 * every position is identical or {@link singleWordPairMatch}.
 */
function multiWordSameTokenCountFuzzyMatch(wa: string[], wb: string[]): boolean {
  if (wa.length !== wb.length || wa.length < 2) return false;
  for (const [i, wordA] of wa.entries()) {
    if (wordA === wb[i]) continue;
    if (!singleWordPairMatch(wordA, wb[i])) return false;
  }
  return true;
}

/** Both sides are one whitespace-delimited word each (e.g. `test` vs `testing` / `notest`). */
function singleWordPairMatch(wordA: string, wordB: string): boolean {
  const ca = compactWordToken(wordA);
  const cb = compactWordToken(wordB);
  if (ca.length < SIMPLE_NAME_MATCH_MIN_LEN && cb.length < SIMPLE_NAME_MATCH_MIN_LEN) return false;
  if (ca === cb) return true;
  const [cs, cl] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  if (cs.length >= SIMPLE_NAME_MATCH_MIN_LEN && cl.includes(cs)) return true;
  const last = cs.length - SIMPLE_NAME_MATCH_MIN_LEN;
  if (last < 0) return false;
  for (let i = 0; i <= last; i++) {
    if (cl.includes(cs.slice(i, i + SIMPLE_NAME_MATCH_MIN_LEN))) return true;
  }
  return false;
}

/**
 * Straightforward duplicate-name heuristic for merge suggestions (unit-tested):
 * same spelling ignoring spaces/punct; leading phrase match; one-word ⊂ one-word (≥4 chars) or token-in-multi with guard;
 * same token count (≥2): each slot equal or one-word fuzzy pair (e.g. `Test Customer` / `Testing Customer`).
 */
export function customerDisplayNamesSimpleMatch(a: string, b: string): boolean {
  if (a == null || b == null || typeof a !== 'string' || typeof b !== 'string') return false;
  const ta = a.trim();
  const tb = b.trim();
  if (ta.length === 0 || tb.length === 0) return false;
  if (ta === tb) return true;

  const sa = stripAlnumOnly(ta);
  const sb = stripAlnumOnly(tb);
  if (sa.length < 2 || sb.length < 2) return false;
  if (sa === sb) return true;

  const wa = normalizeWordTokens(ta);
  const wb = normalizeWordTokens(tb);
  if (wa.length === 0 || wb.length === 0) return false;

  if (wa.length <= wb.length) {
    if (isWordListPrefix(wa, wb)) return true;
  } else if (isWordListPrefix(wb, wa)) {
    return true;
  }

  if (wa.length === 1 && wb.length > 1) {
    if (singleWordMatchesMultiWord(wa[0], wb)) return true;
  } else if (wb.length === 1 && wa.length > 1) {
    if (singleWordMatchesMultiWord(wb[0], wa)) return true;
  }

  if (wa.length === 1 && wb.length === 1) {
    if (singleWordPairMatch(wa[0], wb[0])) return true;
  }

  if (wa.length > 1 && wb.length === 1) {
    if (multiWordVsSingleWordPair(wa, wb[0])) return true;
  } else if (wb.length > 1 && wa.length === 1) {
    if (multiWordVsSingleWordPair(wb, wa[0])) return true;
  }

  if (wa.length > 1 && wb.length > 1 && multiWordSameTokenCountFuzzyMatch(wa, wb)) return true;

  return false;
}

/** @see customerDisplayNamesSimpleMatch */
export function customerDisplayNamesSimilarForMerge(a: string, b: string): boolean {
  return customerDisplayNamesSimpleMatch(a, b);
}
