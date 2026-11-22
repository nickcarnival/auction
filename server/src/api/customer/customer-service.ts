import { getDb } from '@/db';
import type { Appointment } from '@shared/appointment';
import {
  confidenceFromMergeReasons,
  type CustomerMergeSuggestionGroup,
  type MergeMatchReason,
} from '@shared/customer-merge';
import type { Customer, CustomerWithStats } from '@shared/customer';
import {
  compactCustomerNameForFuzzy,
  customerDisplayNamesSimilarForMerge,
  normalizeCustomerNameForLookup,
  normalizeCustomerNameSortedTokens,
  normalizeCustomerStoredName,
} from '@shared/customer-name-utils';
import { normalizeEmailForLookup } from '@shared/email-utils';
import { normalizePhoneForLookup } from '@shared/phone-utils';
import { ObjectId } from 'mongodb';

const COLLECTION = 'customers';
const MAX_RESULTS = 35;

function buildCustomerUpdateFields(
  appointment: Appointment,
  tenantOid: ObjectId,
  now: string
): {
  phoneNorm: string | null;
  emailNorm: string | null;
  baseSet: Record<string, unknown>;
} {
  const phoneNorm = normalizePhoneForLookup(appointment.phone ?? undefined);
  const emailNorm = normalizeEmailForLookup(appointment.email ?? undefined);
  return {
    phoneNorm,
    emailNorm,
    baseSet: {
      name: normalizeCustomerStoredName(appointment.customer),
      tenantId: tenantOid,
      email: appointment.email?.trim() ? appointment.email.trim() : null,
      phone: appointment.phone ?? null,
      phoneNormalized: phoneNorm,
      emailNormalized: emailNorm,
      updatedDate: now,
    },
  };
}

/** Tenant filter: documents may use ObjectId or string hex for `tenantId`. */
function tenantScope(tenantId: string): Record<string, unknown> {
  const oid = new ObjectId(tenantId);
  return { $or: [{ tenantId: oid }, { tenantId }] };
}

/** Not soft-deleted (merge / archive). */
function activeCustomerMatch(): Record<string, unknown> {
  return { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] };
}

function andClauses(...clauses: Record<string, unknown>[]): Record<string, unknown> {
  return { $and: clauses };
}

/** Escape user input for safe literal use in MongoDB `$regex` (avoids invalid patterns / ReDoS). */
function escapeMongoRegexLiteral(text: string): string {
  const pattern = `${String.raw`[.*+?^$`}${String.raw`{}()|[\]\\]`}`;
  return text.replace(new RegExp(pattern, 'g'), String.raw`\$&`);
}

/**
 * `$expr` value: trim + uppercase + coerce to string (safe on MongoDB 4.0+).
 * Does not collapse *internal* whitespace. Stored names from {@link conditionalCreateCustomer} are
 * single-spaced uppercase.
 */
function mongoExprNormalizedCustomerName(pathOrVar: string): Record<string, unknown> {
  return {
    $toUpper: {
      $trim: {
        input: {
          $convert: {
            input: { $ifNull: [pathOrVar, ''] },
            to: 'string',
            onError: '',
            onNull: '',
          },
        },
      },
    },
  };
}

/**
 * Resolve or create a customer scoped to the tenant. Match priority: normalized phone,
 * then normalized email (including legacy `email` case-insensitive), then name (uppercase stored
 * form; see {@link mongoExprNormalizedCustomerName}).
 */
export const conditionalCreateCustomer = async (
  appointment: Appointment,
  tenantId?: string
): Promise<Customer | null> => {
  const raw = appointment.customer;
  if (raw == null || typeof raw !== 'string' || !tenantId) return null;
  const customerDisplay = normalizeCustomerStoredName(raw);
  if (!customerDisplay) return null;

  const appointmentForWrite: Appointment = { ...appointment, customer: customerDisplay };

  const db = await getDb();
  const collection = db.collection(COLLECTION);
  const tenantOid = new ObjectId(tenantId);
  const now = new Date().toLocaleDateString();
  const { phoneNorm, emailNorm, baseSet } = buildCustomerUpdateFields(
    appointmentForWrite,
    tenantOid,
    now
  );

  let existing: Record<string, unknown> | null = null;

  if (phoneNorm) {
    existing = (await collection.findOne(
      andClauses(tenantScope(tenantId), activeCustomerMatch(), { phoneNormalized: phoneNorm })
    )) as Record<string, unknown> | null;
    if (!existing && appointment.phone) {
      existing = (await collection.findOne(
        andClauses(tenantScope(tenantId), activeCustomerMatch(), { phone: appointment.phone })
      )) as Record<string, unknown> | null;
    }
  } else if (emailNorm) {
    existing = (await collection.findOne(
      andClauses(tenantScope(tenantId), activeCustomerMatch(), { emailNormalized: emailNorm })
    )) as Record<string, unknown> | null;
    if (!existing) {
      existing = (await collection.findOne(
        andClauses(tenantScope(tenantId), activeCustomerMatch(), {
          $expr: {
            $eq: [
              { $toLower: { $trim: { input: { $ifNull: ['$email', ''] } } } },
              emailNorm,
            ],
          },
        })
      )) as Record<string, unknown> | null;
    }
  } else {
    const nameKey = customerDisplay;
    existing = (await collection.findOne(
      andClauses(tenantScope(tenantId), activeCustomerMatch(), {
        $expr: { $eq: [mongoExprNormalizedCustomerName('$name'), nameKey] },
      })
    )) as Record<string, unknown> | null;
  }

  if (existing?._id) {
    await collection.updateOne({ _id: existing._id as ObjectId }, { $set: baseSet });
    const updated = await collection.findOne({ _id: existing._id as ObjectId });
    return updated as unknown as Customer;
  }

  const insertResult = await collection.insertOne({
    ...baseSet,
    createdDate: now,
  });
  const created = await collection.findOne({ _id: insertResult.insertedId });
  return created as unknown as Customer;
};

export interface GetCustomersOptions {
  tenantId: string;
  search?: string;
}

/** Appointments linked to a customer: prefer `customerId`, fall back to legacy name-only rows. */
function appointmentsLookupStage(tenantId: string) {
  const tenantOid = new ObjectId(tenantId);
  return {
    $lookup: {
      from: 'appointments',
      let: {
        customerDocId: '$_id',
        customerName: '$name',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {
                  $or: [
                    { $eq: ['$tenantId', tenantOid] },
                    { $eq: [{ $toString: '$tenantId' }, tenantId] },
                  ],
                },
                {
                  $or: [
                    {
                      $and: [
                        { $ne: [{ $ifNull: ['$customerId', null] }, null] },
                        {
                          $or: [
                            { $eq: ['$customerId', '$$customerDocId'] },
                            {
                              $eq: [
                                { $toString: { $ifNull: ['$customerId', ''] } },
                                { $toString: '$$customerDocId' },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      $and: [
                        { $eq: [{ $ifNull: ['$customerId', null] }, null] },
                        {
                          $eq: [
                            mongoExprNormalizedCustomerName('$customer'),
                            mongoExprNormalizedCustomerName('$$customerName'),
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      as: 'appointments',
    },
  };
}

/** Booking requests linked by `customerId` (same tenant). */
function bookingRequestsLookupStage(tenantId: string) {
  const tenantOid = new ObjectId(tenantId);
  return {
    $lookup: {
      from: 'booking-request',
      let: { customerDocId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {
                  $or: [
                    { $eq: ['$tenantId', tenantOid] },
                    { $eq: [{ $toString: '$tenantId' }, tenantId] },
                  ],
                },
                {
                  $or: [
                    { $eq: ['$customerId', '$$customerDocId'] },
                    {
                      $eq: [
                        { $toString: { $ifNull: ['$customerId', ''] } },
                        { $toString: '$$customerDocId' },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      as: 'bookingRequests',
    },
  };
}

export const getCustomersByTenantId = async (
  options: GetCustomersOptions
): Promise<CustomerWithStats[]> => {
  const { tenantId, search } = options;
  const db = await getDb();
  const customersCollection = db.collection(COLLECTION);

  const matchClauses: Record<string, unknown>[] = [
    tenantScope(tenantId),
    activeCustomerMatch(),
  ];
  const q = typeof search === 'string' ? search.trim() : '';
  if (q.length > 0) {
    const safeEmail = escapeMongoRegexLiteral(q);
    const safeName = escapeMongoRegexLiteral(normalizeCustomerStoredName(q));
    matchClauses.push({
      $or: [
        { name: { $regex: safeName } },
        { email: { $regex: safeEmail, $options: 'i' } },
      ],
    });
  }

  const customers = await customersCollection
    .aggregate([
      { $match: andClauses(...matchClauses) },
      appointmentsLookupStage(tenantId),
      bookingRequestsLookupStage(tenantId),
      {
        $addFields: {
          appointmentCount: { $size: '$appointments' },
          bookingRequestCount: { $size: '$bookingRequests' },
          lastAppointmentDate: {
            $cond: {
              if: { $gt: [{ $size: '$appointments' }, 0] },
              // eslint-disable-next-line unicorn/no-thenable
              then: {
                $dateToString: {
                  date: {
                    $max: {
                      $map: {
                        input: '$appointments',
                        as: 'appointment',
                        in: {
                          $dateFromString: {
                            dateString: '$$appointment.start',
                            onError: new Date(0),
                          },
                        },
                      },
                    },
                  },
                  format: '%Y-%m-%dT%H:%M:%S.%LZ',
                },
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          appointments: 0,
          bookingRequests: 0,
        },
      },
      { $sort: { createdDate: -1 } },
      { $limit: MAX_RESULTS },
    ])
    .toArray();

  return customers as unknown as CustomerWithStats[];
};

/** All active customers for the tenant (no UI search limit). For CSV export only. */
export const getCustomersForCsvExport = async (tenantId: string): Promise<Customer[]> => {
  const db = await getDb();
  const customersCollection = db.collection(COLLECTION);

  const docs = await customersCollection
    .find(andClauses(tenantScope(tenantId), activeCustomerMatch()))
    .project({ _id: 1, name: 1, email: 1, phone: 1, createdDate: 1, updatedDate: 1 })
    .sort({ name: 1 })
    .toArray();

  return docs.map(doc => {
    const rawId = doc._id as ObjectId | string;
    const _id = typeof rawId === 'string' ? rawId : rawId.toHexString();
    return {
      _id,
      name: doc.name != null ? String(doc.name) : '',
      email: doc.email != null ? String(doc.email) : '',
      phone: doc.phone != null ? String(doc.phone) : '',
      tenantId,
      createdDate: doc.createdDate != null ? String(doc.createdDate) : undefined,
      updatedDate: doc.updatedDate != null ? String(doc.updatedDate) : undefined,
    };
  });
};

export const getCustomerById = async (
  customerId: string,
  tenantId: string
): Promise<CustomerWithStats | null> => {
  const db = await getDb();
  const customersCollection = db.collection(COLLECTION);

  const customer = await customersCollection
    .aggregate([
      {
        $match: andClauses(
          { _id: new ObjectId(customerId) },
          tenantScope(tenantId),
          activeCustomerMatch()
        ),
      },
      appointmentsLookupStage(tenantId),
      bookingRequestsLookupStage(tenantId),
      {
        $addFields: {
          appointmentCount: { $size: '$appointments' },
          bookingRequestCount: { $size: '$bookingRequests' },
          lastAppointmentDate: {
            $cond: {
              if: { $gt: [{ $size: '$appointments' }, 0] },
              // eslint-disable-next-line unicorn/no-thenable
              then: {
                $dateToString: {
                  date: {
                    $max: {
                      $map: {
                        input: '$appointments',
                        as: 'appointment',
                        in: {
                          $dateFromString: {
                            dateString: '$$appointment.start',
                            onError: new Date(0),
                          },
                        },
                      },
                    },
                  },
                  format: '%Y-%m-%dT%H:%M:%S.%LZ',
                },
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          appointments: 0,
          bookingRequests: 0,
        },
      },
    ])
    .toArray();

  return (customer[0] as unknown as CustomerWithStats) || null;
};

type LinkedAppointmentContact = {
  displayName: string;
  email: string | null;
  phone: string | null;
};

/**
 * For rows with `customerId`, keep denormalized appointment contact fields aligned with the
 * customer document (name, email, phone).
 */
async function syncLinkedAppointmentsFromCustomer(
  tenantId: string,
  customerId: string,
  contact: LinkedAppointmentContact
): Promise<void> {
  const db = await getDb();
  const appt = db.collection('appointments');
  const cidOid = new ObjectId(customerId);
  await appt.updateMany(
    {
      $and: [
        appointmentTenantMatch(tenantId),
        {
          $or: [
            { customerId: cidOid },
            { customerId: customerId },
            {
              $expr: {
                $eq: [{ $toString: { $ifNull: ['$customerId', ''] } }, customerId],
              },
            },
          ],
        },
      ],
    },
    {
      $set: {
        customer: contact.displayName,
        email: contact.email,
        phone: contact.phone,
      },
    }
  );
}

export async function updateCustomerProfile(
  tenantId: string,
  customerId: string,
  profile: { name: string; email: string; phone: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getCustomerById(customerId, tenantId);
  if (!existing?._id) {
    return { ok: false, error: 'not_found' };
  }

  const finalName = normalizeCustomerStoredName(profile.name);
  if (!finalName) {
    return { ok: false, error: 'name_required' };
  }

  const finalEmail = profile.email.trim() || null;
  const finalPhone = profile.phone.trim() || null;

  const db = await getDb();
  const cust = db.collection(COLLECTION);
  const nowLocale = new Date().toLocaleDateString();
  const phoneNorm = normalizePhoneForLookup(finalPhone ?? undefined);
  const emailNorm = normalizeEmailForLookup(finalEmail ?? undefined);

  const result = await cust.updateOne(
    andClauses({ _id: new ObjectId(customerId) }, tenantScope(tenantId), activeCustomerMatch()),
    {
      $set: {
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        phoneNormalized: phoneNorm,
        emailNormalized: emailNorm,
        updatedDate: nowLocale,
      },
    }
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: 'not_found' };
  }

  await syncLinkedAppointmentsFromCustomer(tenantId, customerId, {
    displayName: finalName,
    email: finalEmail,
    phone: finalPhone,
  });

  return { ok: true };
}

function appointmentTenantMatch(tenantId: string): Record<string, unknown> {
  const oid = new ObjectId(tenantId);
  const hex = oid.toHexString();
  return { $or: [{ tenantId: oid }, { tenantId: hex }] };
}

function customerIdGroupKey(ids: ObjectId[]): string {
  return [...ids]
    .map(i => i.toHexString())
    .sort()
    .join('|');
}

type SuggestionAcc = {
  idHexes: string[];
  reasons: MergeMatchReason[];
  keys: string[];
};

const COMPOSITE_SEP = '\u001F';

type NameFuzzEntry = {
  id: ObjectId;
  raw: string;
  collated: string | null;
};

/** Similar display names — `customerDisplayNamesSimilarForMerge` (simple match: ≥4 chars, phrase prefix, guarded tokens). */
function clusterIdsBySimilarDisplayName(entries: NameFuzzEntry[]): ObjectId[][] {
  if (entries.length < 2) return [];
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    if (p !== x) {
      p = find(p);
      parent.set(x, p);
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const ci = entries[i].collated;
      const cj = entries[j].collated;
      if (ci != null && ci === cj) continue;
      if (customerDisplayNamesSimilarForMerge(entries[i].raw, entries[j].raw)) {
        union(entries[i].id.toHexString(), entries[j].id.toHexString());
      }
    }
  }

  const byRoot = new Map<string, ObjectId[]>();
  for (const e of entries) {
    const h = e.id.toHexString();
    const r = find(h);
    const list = byRoot.get(r) ?? [];
    list.push(e.id);
    byRoot.set(r, list);
  }
  return [...byRoot.values()].filter(g => g.length >= 2);
}

function dedupeNameEntriesById(entries: NameFuzzEntry[]): NameFuzzEntry[] {
  const byHex = new Map<string, NameFuzzEntry>();
  for (const e of entries) {
    const h = e.id.toHexString();
    if (!byHex.has(h)) byHex.set(h, e);
  }
  return [...byHex.values()];
}

/**
 * Sort key: strongest match signal first (phone → email → name-only), then how much activity is
 * split across the group, then how many profiles are involved.
 */
function mergeSuggestionLikelihoodScore(group: CustomerMergeSuggestionGroup): number {
  const totalAppts = group.customers.reduce((sum, c) => sum + (c.appointmentCount ?? 0), 0);
  const profileCount = group.customers.length;
  return group.confidenceScore * 1_000_000 + totalAppts * 100 + profileCount;
}

/**
 * Groups customers that share a normalized phone, email, or (contact-less) the same name.
 * Uses raw `phone` / `email` fields so legacy rows without `phoneNormalized` still match.
 * Name-only: no usable phone and no usable email; grouped by collated name (sorted tokens) when
 * possible, else legacy normalized string.
 *
 * **name_collated** links profiles that share the same multiset of words (punctuation / word order
 * ignored), even when phone/email differ. **name_contains** links when one full compact name is a
 * substring of another. **name_fuzzy** adds typo / extra-character clusters.
 *
 * Standalone **phone** matches use normalized phone only (same number → one group even if emails
 * differ). Standalone **email** matches use normalized email only (same address → one group even if
 * phones differ). Composite keys (`phone_email`, `phone_name`, `email_name`) still add stronger
 * agreement when contact fields align.
 */
export async function getMergeSuggestionsForTenant(
  tenantId: string
): Promise<CustomerMergeSuggestionGroup[]> {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const docs = await collection
    .find(andClauses(tenantScope(tenantId), activeCustomerMatch()), {
      projection: { _id: 1, phone: 1, email: 1, name: 1 },
    })
    .toArray();

  const phoneToIds = new Map<string, ObjectId[]>();
  const emailToIds = new Map<string, ObjectId[]>();
  const nameToIds = new Map<string, ObjectId[]>();
  const phoneEmailToIds = new Map<string, ObjectId[]>();
  const phoneNameToIds = new Map<string, ObjectId[]>();
  const emailNameToIds = new Map<string, ObjectId[]>();
  const nameCollatedToIds = new Map<string, ObjectId[]>();
  const nameSimilarEntries: NameFuzzEntry[] = [];

  for (const d of docs) {
    const id = d._id as ObjectId;
    const phone = typeof d.phone === 'string' ? d.phone : null;
    const email = typeof d.email === 'string' ? d.email : null;
    const name = typeof d.name === 'string' ? d.name : null;

    const pn = normalizePhoneForLookup(phone);
    const en = normalizeEmailForLookup(email);
    const nn = normalizeCustomerNameForLookup(name);
    const nSort = normalizeCustomerNameSortedTokens(name);
    const nameForComposite = nSort ?? nn;

    if (nSort) {
      const list = nameCollatedToIds.get(nSort) ?? [];
      list.push(id);
      nameCollatedToIds.set(nSort, list);
    }

    const compactFuzz = compactCustomerNameForFuzzy(name);
    if (compactFuzz && typeof name === 'string') {
      nameSimilarEntries.push({ id, raw: name, collated: nSort });
    }

    if (pn) {
      const list = phoneToIds.get(pn) ?? [];
      list.push(id);
      phoneToIds.set(pn, list);
    }
    if (en) {
      const list = emailToIds.get(en) ?? [];
      list.push(id);
      emailToIds.set(en, list);
    }
    if (pn == null && en == null && nn != null) {
      const nameOnlyKey = nSort ?? nn;
      const list = nameToIds.get(nameOnlyKey) ?? [];
      list.push(id);
      nameToIds.set(nameOnlyKey, list);
    }
    if (pn && en) {
      const ck = `${pn}${COMPOSITE_SEP}${en}`;
      const list = phoneEmailToIds.get(ck) ?? [];
      list.push(id);
      phoneEmailToIds.set(ck, list);
    }
    if (pn && nameForComposite) {
      const ck = `${pn}${COMPOSITE_SEP}${nameForComposite}`;
      const list = phoneNameToIds.get(ck) ?? [];
      list.push(id);
      phoneNameToIds.set(ck, list);
    }
    if (en && nameForComposite) {
      const ck = `${en}${COMPOSITE_SEP}${nameForComposite}`;
      const list = emailNameToIds.get(ck) ?? [];
      list.push(id);
      emailNameToIds.set(ck, list);
    }
  }

  const merged = new Map<string, SuggestionAcc>();
  const accumulate = (ids: ObjectId[], reason: MergeMatchReason, key: string) => {
    const uniqueHex = [...new Set(ids.map(i => i.toHexString()))];
    if (uniqueHex.length < 2) return;
    const uniqueIds = uniqueHex.map(h => new ObjectId(h));
    const gk = customerIdGroupKey(uniqueIds);
    const cur = merged.get(gk);
    if (!cur) {
      merged.set(gk, {
        idHexes: uniqueHex.sort(),
        reasons: [reason],
        keys: [key],
      });
    } else {
      cur.reasons.push(reason);
      cur.keys.push(key);
    }
  };

  for (const [key, ids] of phoneEmailToIds) {
    accumulate(ids, 'phone_email', key);
  }
  for (const [key, ids] of phoneNameToIds) {
    accumulate(ids, 'phone_name', key);
  }
  for (const [key, ids] of emailNameToIds) {
    accumulate(ids, 'email_name', key);
  }
  for (const [key, ids] of phoneToIds) {
    accumulate(ids, 'phone', key);
  }
  for (const [key, ids] of emailToIds) {
    accumulate(ids, 'email', key);
  }
  for (const [key, ids] of nameToIds) {
    accumulate(ids, 'name', key);
  }
  for (const [key, ids] of nameCollatedToIds) {
    accumulate(ids, 'name_collated', key);
  }
  for (const cluster of clusterIdsBySimilarDisplayName(dedupeNameEntriesById(nameSimilarEntries))) {
    /* Keys are only for debugging merges — keep short; UI hides `similar` (see client keysForDisplay). */
    accumulate(cluster, 'name_similar', 'similar');
  }

  const out: CustomerMergeSuggestionGroup[] = [];
  for (const acc of merged.values()) {
    const resolvedCustomers = await Promise.all(
      acc.idHexes.map(id => getCustomerById(id, tenantId))
    );
    const customers = resolvedCustomers.filter((c): c is CustomerWithStats => c != null);
    if (customers.length < 2) continue;

    const reasons = [...new Set(acc.reasons)];
    const keys = [...new Set(acc.keys)];
    const confidenceScore = confidenceFromMergeReasons(reasons);
    customers.sort((a, b) => {
      const ac = a.appointmentCount ?? 0;
      const bc = b.appointmentCount ?? 0;
      if (bc !== ac) return bc - ac;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    out.push({ reasons, keys, customers, confidenceScore });
  }

  out.sort((a, b) => mergeSuggestionLikelihoodScore(b) - mergeSuggestionLikelihoodScore(a));
  return out;
}

/** Appointments / booking requests referencing any of these customer ids (ObjectId, hex string, or stringified id). */
function mergedCustomerIdsClause(mergeHexIds: string[]): Record<string, unknown> {
  const oids = mergeHexIds.map(id => new ObjectId(id));
  return {
    $or: [
      { customerId: { $in: oids } },
      { customerId: { $in: mergeHexIds } },
      {
        $expr: {
          $in: [{ $toString: { $ifNull: ['$customerId', ''] } }, mergeHexIds],
        },
      },
    ],
  };
}

/**
 * Merges duplicate customer profiles: re-homes **appointments** and **booking requests** onto
 * `keepCustomerId`, soft-deletes merged rows, and optionally sets name/email/phone (plus normalized
 * fields) on the kept row. **Appointments** re-home `customerId` and denormalized `customer` name;
 * **booking requests** re-home `customerId` and sync denormalized `name` / `email` / `phone` to the
 * kept profile so the Requests tab matches the customer record after a merge.
 *
 * Legacy appointments that only match by `customer` name (no `customerId`) are unchanged here —
 * use profile / schedule edits or a dedicated backfill if you need those linked.
 *
 * Uses batched writes (one pass per collection) instead of per-merge round trips for speed.
 */
export async function mergeCustomersIntoKeep(
  tenantId: string,
  keepCustomerId: string,
  mergeCustomerIds: string[],
  profile?: { name: string; email: string; phone: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniqueMerge = [...new Set(mergeCustomerIds)].filter(id => id !== keepCustomerId);
  if (uniqueMerge.length === 0) {
    return { ok: false, error: 'no_merge_targets' };
  }

  const db = await getDb();
  const cust = db.collection(COLLECTION);
  const keepOid = new ObjectId(keepCustomerId);

  const keepDoc = await cust.findOne(
    andClauses({ _id: keepOid }, tenantScope(tenantId), activeCustomerMatch()),
    { projection: { _id: 1, name: 1, email: 1, phone: 1 } }
  );
  if (!keepDoc?._id) {
    return { ok: false, error: 'keep_not_found' };
  }

  const keepName = typeof keepDoc.name === 'string' ? keepDoc.name : '';
  const keepEmail = typeof keepDoc.email === 'string' ? keepDoc.email : '';
  const keepPhone = typeof keepDoc.phone === 'string' ? keepDoc.phone : '';

  const finalName = profile
    ? normalizeCustomerStoredName(profile.name)
    : normalizeCustomerStoredName(keepName);
  if (!finalName) {
    return { ok: false, error: 'name_required' };
  }

  const finalEmail = profile ? profile.email.trim() || null : keepEmail.trim() || null;
  const finalPhone = profile ? profile.phone.trim() || null : keepPhone.trim() || null;

  const mergeOids = uniqueMerge.map(id => new ObjectId(id));
  const mergeRows = await cust
    .find(
      andClauses({ _id: { $in: mergeOids } }, tenantScope(tenantId), activeCustomerMatch()),
      { projection: { _id: 1 } }
    )
    .toArray();
  if (mergeRows.length !== uniqueMerge.length) {
    return { ok: false, error: 'merge_not_found' };
  }

  const idClause = mergedCustomerIdsClause(uniqueMerge);
  const tenantAndIds = { $and: [appointmentTenantMatch(tenantId), idClause] };

  await db.collection('appointments').updateMany(tenantAndIds, {
    $set: { customerId: keepOid, customer: finalName },
  });

  await db.collection('booking-request').updateMany(tenantAndIds, {
    $set: {
      customerId: keepOid,
      name: finalName,
      email: finalEmail,
      phone: finalPhone,
    },
  });

  const nowIso = new Date().toISOString();
  const nowLocale = new Date().toLocaleDateString();
  const archiveResult = await cust.bulkWrite(
    uniqueMerge.map(mergeId => ({
      updateOne: {
        filter: andClauses(
          { _id: new ObjectId(mergeId) },
          tenantScope(tenantId),
          activeCustomerMatch()
        ),
        update: {
          $set: {
            deletedAt: nowIso,
            mergedIntoCustomerId: keepCustomerId,
            updatedDate: nowLocale,
          },
        },
      },
    }))
  );

  if (archiveResult.matchedCount !== uniqueMerge.length) {
    return { ok: false, error: 'merge_customer_not_archived' };
  }

  if (profile !== undefined) {
    const phoneNorm = normalizePhoneForLookup(finalPhone ?? undefined);
    const emailNorm = normalizeEmailForLookup(finalEmail ?? undefined);

    await cust.updateOne(
      andClauses({ _id: keepOid }, tenantScope(tenantId), activeCustomerMatch()),
      {
        $set: {
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          phoneNormalized: phoneNorm,
          emailNormalized: emailNorm,
          updatedDate: nowLocale,
        },
      }
    );
  }

  await syncLinkedAppointmentsFromCustomer(tenantId, keepCustomerId, {
    displayName: finalName,
    email: finalEmail,
    phone: finalPhone,
  });

  return { ok: true };
}
