import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerWithStats } from '@shared/customer';
import {
  buildInstantUnambiguousMergePayload,
  buildInstantUnambiguousMergePayloadForGroup,
  confidenceFromMergeReasons,
  groupMergeFocusCustomerId,
  mergeGroupEligibleForInstantUnambiguousMerge,
  mergeGroupMatchesQuickFilter,
  mergeReasonsForSimpleBadges,
  mergeSimpleBadgeLabel,
  type CustomerMergeSuggestionGroup,
  type InstantUnambiguousMergePayload,
  type MergeQuickFilter,
} from '@shared/customer-merge';

export { groupMergeFocusCustomerId } from '@shared/customer-merge';
import { normalizeEmailForLookup } from '@shared/email-utils';
import { formatPhone, normalizePhoneForLookup } from '@shared/phone-utils';
import {
  normalizeCustomerNameForMatch,
  normalizeCustomerNameWhileTyping,
} from '@shared/customer-name-utils';
import { customerMergeProfileSchema, type CustomerMergeProfile } from '@shared/schemas/customer-merge-schema';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { BASE_URL } from '@/utils/environment-util';
import { invalidateBookingQueueCounts } from '@/lib/invalidate-booking-queue-counts';
import { useAuth } from '@/pages/auth/auth-provider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { Input } from '@/components/ui/input';
import { MaskedTelInput } from '@/components/ui/form/masked-tel-input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Archive, Check, ChevronLeft, ChevronRight, GitMerge, Loader2, Zap } from 'lucide-react';

export const CUSTOMER_MERGE_SUGGESTIONS_QUERY_KEY = 'customer-merge-suggestions' as const;

export function useMergeSuggestionsQuery() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  return useQuery({
    queryKey: [CUSTOMER_MERGE_SUGGESTIONS_QUERY_KEY, tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/customers/merge-suggestions`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const raw = (await response.json()) as CustomerMergeSuggestionGroup[];
      return raw.map(g => ({
        ...g,
        confidenceScore: g.confidenceScore ?? confidenceFromMergeReasons(g.reasons),
      }));
    },
    enabled: !!tenantId,
  });
}

/** One-line CTA on the customer list when duplicate groups exist. */
export function CustomerDuplicatesBanner() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const { data: suggestions = [], isLoading, isFetched } = useMergeSuggestionsQuery();

  if (!tenantId || isLoading || !isFetched || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-warning/35 bg-warning/5 px-3 py-2 text-sm dark:border-warning/25 dark:bg-warning/10">
      <span className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
        <GitMerge className="h-4 w-4 shrink-0 text-warning-emphasis" aria-hidden />
        <span className="min-w-0 break-words leading-snug">
          {suggestions.length} probably duplicate {suggestions.length === 1 ? 'group' : 'groups'}
        </span>
      </span>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link to="/dashboard/customers/duplicates">Review duplicates</Link>
      </Button>
    </div>
  );
}

function MergeOutcomePreview({
  keeper,
  archived,
  afterMergeName,
  afterMergeEmail,
  afterMergePhone,
}: {
  keeper: CustomerWithStats;
  archived: CustomerWithStats[];
  afterMergeName: string;
  afterMergeEmail: string;
  afterMergePhone: string;
}) {
  const displayName = afterMergeName.trim() || keeper.name || 'Customer';

  return (
    <div className="mt-4 min-w-0 space-y-4 overflow-x-hidden break-words rounded-md border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">After merge</h3>

      <div className="min-w-0 space-y-2 rounded-md border border-primary/30 bg-muted/50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Kept customer record
        </p>
        <p className="text-base font-semibold text-foreground">{displayName}</p>
        <div className="min-w-0 space-y-0.5 text-sm text-muted-foreground">
          {afterMergeEmail.trim() ? (
            <div className="[overflow-wrap:anywhere]">{afterMergeEmail.trim()}</div>
          ) : (
            <div className="italic">No email on file</div>
          )}
          {afterMergePhone.trim() ? (
            <div>{formatPhone(afterMergePhone.trim())}</div>
          ) : (
            <div className="italic">No phone on file</div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Shown values match the saved profile you edit in the form. Appointments from archived
          profiles link to this record; their booking text uses the display name above.
        </p>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Archived profiles ({archived.length})
        </p>
        <ul className="list-none space-y-2 pl-0 text-sm text-foreground">
          {archived.map(c => (
            <li
              key={c._id}
              className="min-w-0 break-words border-l-2 border-muted-foreground/25 pl-3"
            >
              <span className="font-medium">{c.name}</span>
              {c.email ? <span className="text-muted-foreground"> · {c.email}</span> : null}
              {c.phone ? (
                <span className="text-muted-foreground"> · {formatPhone(c.phone)}</span>
              ) : null}
              <span className="text-muted-foreground">
                {' '}
                — {c.appointmentCount} appt{c.appointmentCount === 1 ? '' : 's'} today
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const KEY_SEP = '\u001F';

function formatMergeKey(key: string): string {
  const sepIdx = key.indexOf(KEY_SEP);
  if (sepIdx === -1) {
    return /^\d{10,15}$/.test(key) ? formatPhone(key) : key;
  }
  const a = key.slice(0, sepIdx);
  const b = key.slice(sepIdx + KEY_SEP.length);
  const left = /^\d{10,15}$/.test(a) ? formatPhone(a) : a;
  if (!b) return left;
  const right = /^\d{10,15}$/.test(b) ? formatPhone(b) : b;
  return `${left} · ${right}`;
}

/**
 * Cluster reasons store debug keys like `similar\u001F<id>|<id>|…` — never show that in the UI.
 */
function isInternalClusterMergeKey(key: string): boolean {
  if (key === 'similar') return true;
  const sepIdx = key.indexOf(KEY_SEP);
  if (sepIdx === -1) return false;
  const prefix = key.slice(0, sepIdx);
  return prefix === 'similar' || prefix === 'fuzzy' || prefix === 'contains';
}

/** Hide raw phone/email/name keys when the same values appear inside a composite key. */
function keysForDisplay(keys: string[]): string[] {
  const userFacing = keys.filter(k => !isInternalClusterMergeKey(k));
  const formatted = userFacing.map(k => formatMergeKey(k));
  const uniq = [...new Set(formatted)];
  const composites = uniq.filter(f => f.includes(' · '));
  if (composites.length === 0) return uniq;

  const coveredParts = new Set<string>();
  for (const c of composites) {
    for (const part of c.split(' · ')) {
      const t = part.trim();
      if (t) coveredParts.add(t);
    }
  }
  return uniq.filter(f => (f.includes(' · ') ? true : !coveredParts.has(f)));
}

function mergeGroupStableKey(g: CustomerMergeSuggestionGroup): string {
  return g.customers
    .map(c => c._id)
    .filter((id): id is string => id !== undefined && id !== '')
    .sort()
    .join('|');
}

async function invalidateAfterCustomerMerge(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string | undefined
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customers', tenantId] }),
    queryClient.invalidateQueries({
      queryKey: [CUSTOMER_MERGE_SUGGESTIONS_QUERY_KEY, tenantId],
    }),
    queryClient.invalidateQueries({ queryKey: ['customer'] }),
    queryClient.invalidateQueries({ queryKey: ['customer-appointments'] }),
    queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] }),
    queryClient.invalidateQueries({ queryKey: ['all-notifications'] }),
    invalidateBookingQueueCounts(queryClient),
  ]);
  /** Refetch while mounted so the duplicates directory updates without a manual reload. */
  await queryClient.refetchQueries({
    queryKey: [CUSTOMER_MERGE_SUGGESTIONS_QUERY_KEY],
    type: 'active',
  });
}

/** One-click merge when every included profile matches on name, phone, and email (normalized). */
function InstantUnambiguousMergeButton({
  payload,
}: {
  payload: InstantUnambiguousMergePayload | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId;

  const mutation = useMutation({
    mutationFn: async (body: InstantUnambiguousMergePayload) => {
      const response = await fetch(`${BASE_URL}/api/customers/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          keepCustomerId: body.keepCustomerId,
          mergeCustomerIds: body.mergeCustomerIds,
          profile: body.profile,
        }),
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Could not merge customers'));
      }
    },
    onSuccess: async (_, body) => {
      toast.success(`Merged — ${body.profile.name} kept.`);
      await invalidateAfterCustomerMerge(queryClient, tenantId);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  if (!payload || !tenantId) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-full shrink-0 gap-1.5 sm:w-auto"
      disabled={mutation.isPending}
      title="Same name, phone, and email (case-insensitive). Name → uppercase, email → lowercase, phone unchanged."
      onClick={() => mutation.mutate(payload)}
    >
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Zap className="h-4 w-4 shrink-0" aria-hidden />
      )}
      Merge now
    </Button>
  );
}

/** Read-only summary for the “all duplicate groups” list — merge only on the per-group page. */
function DuplicateGroupOverviewRow({
  group,
  index,
  total,
}: {
  group: CustomerMergeSuggestionGroup;
  index: number;
  total: number;
}) {
  const simpleBadges = useMemo(() => mergeReasonsForSimpleBadges(group.reasons), [group.reasons]);
  const displayKeys = useMemo(() => keysForDisplay(group.keys), [group.keys]);
  const instantPayload = useMemo(() => buildInstantUnambiguousMergePayloadForGroup(group), [group]);
  const focusId = groupMergeFocusCustomerId(group);
  const profileCount = group.customers.length;
  const customersSorted = useMemo(
    () =>
      [...group.customers].sort((a, b) => {
        const ac = a.appointmentCount ?? 0;
        const bc = b.appointmentCount ?? 0;
        if (bc !== ac) return bc - ac;
        return (a.name ?? '').localeCompare(b.name ?? '');
      }),
    [group.customers]
  );

  return (
    <div className="min-w-0 rounded-lg border border-warning/35 bg-warning/5 px-3 py-3 shadow-sm sm:px-4 dark:border-warning/25 dark:bg-warning/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
            Group {index + 1} of {total}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {simpleBadges.map(b => (
              <Badge key={b} variant="secondary" className="text-xs font-normal">
                {mergeSimpleBadgeLabel(b)}
              </Badge>
            ))}
          </div>
          {displayKeys.length > 0 ? (
            <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {displayKeys.join(' · ')}
            </p>
          ) : null}
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Profiles ({profileCount})
            </p>
            <ul className="list-none space-y-1 pl-0 text-sm text-foreground">
              {customersSorted.map((c, rowIdx) => {
                const id = c._id?.trim();
                const label = (c.name ?? '').trim() || 'Unnamed';
                const n = c.appointmentCount ?? 0;
                const apptLabel = `${n} appointment${n === 1 ? '' : 's'}`;
                return (
                  <li
                    key={id && id !== '' ? id : `row-${rowIdx}`}
                    className="min-w-0 [overflow-wrap:anywhere] leading-snug"
                  >
                    {id ? (
                      <Link
                        to={`/dashboard/customers/${id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="font-medium">{label}</span>
                    )}
                    <span className="text-muted-foreground"> · {apptLabel}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {focusId ? (
            <Button variant="default" size="sm" className="w-full shrink-0 sm:w-auto" asChild>
              <Link to={`/dashboard/customers/${focusId}/merge`}>Review & merge</Link>
            </Button>
          ) : null}
          <InstantUnambiguousMergeButton payload={instantPayload} />
        </div>
      </div>
    </div>
  );
}

/**
 * Compact CTA on the customer detail page when merge suggestions include this id. Full UI lives
 * at `/dashboard/customers/:customerId/merge`.
 */
export function CustomerMergePromptLink({ customerId }: { customerId: string }) {
  const { data: suggestions = [], isLoading, isFetched } = useMergeSuggestionsQuery();
  const hasMerge = useMemo(
    () => suggestions.some(g => g.customers.some(c => c._id === customerId)),
    [suggestions, customerId]
  );

  if (!customerId) {
    return null;
  }

  if (isLoading || !isFetched) {
    return null;
  }

  if (!hasMerge) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-warning/35 bg-warning/5 px-3 py-2 text-sm dark:border-warning/25 dark:bg-warning/10">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <GitMerge className="h-4 w-4 shrink-0 text-warning-emphasis" aria-hidden />
        <span className="min-w-0 leading-snug">Probably duplicate profiles for this customer.</span>
      </span>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link to={`/dashboard/customers/${customerId}/merge`}>Review merge</Link>
      </Button>
    </div>
  );
}

/** @deprecated Use {@link CustomerMergePromptLink}. Kept for cached bundles or stale imports. */
export const CustomerPageMergeSection = CustomerMergePromptLink;

export function MergeSuggestionBlock({
  group,
  preferredKeepCustomerId,
  mergeKind = 'duplicate',
}: {
  group: CustomerMergeSuggestionGroup;
  /** When set (e.g. on customer detail), default “keep” selection to this profile. */
  preferredKeepCustomerId?: string;
  mergeKind?: 'duplicate' | 'manual';
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId;

  const groupKey = useMemo(
    () =>
      group.customers
        .map(c => c._id)
        .filter((id): id is string => id !== undefined && id !== '')
        .sort()
        .join('|'),
    [group.customers]
  );

  const [keepId, setKeepId] = useState(() => group.customers[0]?._id ?? '');
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const form = useForm<CustomerMergeProfile>({
    resolver: zodResolver(customerMergeProfileSchema),
    defaultValues: { name: '', email: '', phone: '' },
    mode: 'onTouched',
  });

  const resultName = form.watch('name');
  const resultEmail = form.watch('email');
  const resultPhone = form.watch('phone');

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const c of group.customers) {
      if (c._id) next[c._id] = true;
    }
    setIncluded(next);
    const ids = group.customers.flatMap(c =>
      c._id != null && c._id !== '' ? [c._id] : []
    );
    const preferred =
      preferredKeepCustomerId && ids.includes(preferredKeepCustomerId)
        ? preferredKeepCustomerId
        : undefined;
    const fallback = group.customers.find(c => c._id)?._id ?? '';
    setKeepId(preferred ?? fallback);
  }, [groupKey, group.customers, preferredKeepCustomerId]);

  useEffect(() => {
    if (keepId && included[keepId]) return;
    const fallback = group.customers.find(c => c._id && included[c._id])?._id;
    if (fallback) setKeepId(fallback);
  }, [included, keepId, group.customers]);

  useEffect(() => {
    const k = group.customers.find(c => c._id === keepId);
    if (k) {
      form.reset({
        name: k.name ?? '',
        email: k.email ?? '',
        phone: k.phone ? formatPhone(k.phone) : '',
      });
    }
  }, [keepId, groupKey, group.customers, form]);

  const mergeTargets = useMemo(
    () =>
      group.customers
        .filter(c => c._id && included[c._id] && c._id !== keepId)
        .map(c => c._id as string),
    [group.customers, included, keepId]
  );

  const includedCustomers = useMemo(
    () => group.customers.filter(c => c._id && included[c._id]),
    [group.customers, included]
  );

  /** One control per distinct value so identical phones/emails/names are not repeated. */
  const nameQuickPicks = useMemo(() => {
    const byNormKey = new Map<string, CustomerWithStats>();
    for (const c of includedCustomers) {
      const label = (c.name ?? '').trim();
      if (!label) continue;
      const key = normalizeCustomerNameForMatch(label);
      if (!key) continue;
      if (!byNormKey.has(key)) byNormKey.set(key, c);
    }
    return [...byNormKey.entries()].map(([, customer]) => ({
      name: customer.name ?? '',
      customer,
    }));
  }, [includedCustomers]);

  const phoneQuickPicks = useMemo(() => {
    const byNorm = new Map<string, string>();
    for (const c of includedCustomers) {
      const raw = c.phone?.trim();
      if (!raw) continue;
      const norm = normalizePhoneForLookup(raw);
      if (!norm) continue;
      if (!byNorm.has(norm)) byNorm.set(norm, raw);
    }
    return [...byNorm.entries()].map(([normalized, raw]) => ({
      normalized,
      raw,
      display: formatPhone(raw) || raw,
    }));
  }, [includedCustomers]);

  const emailQuickPicks = useMemo(() => {
    const byNorm = new Map<string, string>();
    for (const c of includedCustomers) {
      const raw = c.email?.trim();
      if (!raw) continue;
      const norm = normalizeEmailForLookup(raw);
      if (!norm) continue;
      if (!byNorm.has(norm)) byNorm.set(norm, raw);
    }
    return [...byNorm.entries()].map(([normalized, raw]) => ({
      normalized,
      raw,
      display: raw.length > 40 ? `${raw.slice(0, 37)}…` : raw,
    }));
  }, [includedCustomers]);

  const showNameQuickPicks = nameQuickPicks.length > 1;
  const showPhoneQuickPicks = phoneQuickPicks.length > 1;
  const showEmailQuickPicks = emailQuickPicks.length > 1;

  const keeper = group.customers.find(c => c._id === keepId);

  const toggleInclude = useCallback(
    (id: string, checked: boolean) => {
      setIncluded(prev => {
        if (!checked) {
          const next = { ...prev, [id]: false };
          const nOn = group.customers.filter(c => c._id && next[c._id]).length;
          if (nOn < 2) {
            toast.error('At least two profiles must be included in a merge');
            return prev;
          }
          return next;
        }
        return { ...prev, [id]: true };
      });
    },
    [group.customers]
  );

  const applyProfileFieldFromCustomer = useCallback(
    (c: CustomerWithStats, field: 'name' | 'email' | 'phone' | 'all') => {
      if (field === 'all' || field === 'name') {
        form.setValue('name', c.name ?? '', { shouldValidate: true, shouldDirty: true });
      }
      if (field === 'all' || field === 'email') {
        form.setValue('email', c.email ?? '', { shouldValidate: true, shouldDirty: true });
      }
      if (field === 'all' || field === 'phone') {
        form.setValue('phone', c.phone ? formatPhone(c.phone) : '', {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [form]
  );

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const profile = form.getValues();
      const nameForApi = profile.name.trim();
      const response = await fetch(`${BASE_URL}/api/customers/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          keepCustomerId: keepId,
          mergeCustomerIds: mergeTargets,
          profile: {
            name: nameForApi,
            email: profile.email.trim(),
            phone: profile.phone.trim(),
          },
        }),
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Could not merge customers'));
      }
    },
    onSuccess: async () => {
      const nameTrim = (form.getValues().name ?? '').trim();
      const keptLabel =
        nameTrim || keeper?.name?.trim() || 'Kept profile';
      toast.success(`Merge complete — ${keptLabel} is the saved customer.`);
      setConfirmOpen(false);
      await invalidateAfterCustomerMerge(queryClient, tenantId);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  const instantPayload = useMemo(
    () =>
      mergeKind === 'duplicate'
        ? buildInstantUnambiguousMergePayload(includedCustomers, group.reasons)
        : null,
    [mergeKind, includedCustomers, group.reasons]
  );

  const openConfirm = useCallback(async () => {
    if (mergeTargets.length === 0 || !keeper) {
      toast.error('Choose a profile to keep and at least one other to merge');
      return;
    }
    const ok = await form.trigger();
    if (!ok) {
      toast.error('Fix the highlighted fields before merging.');
      return;
    }
    setConfirmOpen(true);
  }, [mergeTargets.length, keeper, form]);

  const simpleBadges = useMemo(() => mergeReasonsForSimpleBadges(group.reasons), [group.reasons]);
  const displayKeys = useMemo(() => keysForDisplay(group.keys), [group.keys]);

  const isManual = mergeKind === 'manual';

  return (
    <div className="h-fit min-w-0 overflow-x-hidden rounded-lg border border-warning/40 bg-warning/5 p-3 shadow-sm sm:p-4 dark:border-warning/25 dark:bg-warning/10">
      <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <GitMerge className="h-4 w-4 shrink-0 text-warning-emphasis" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            {isManual ? 'Merge selected customers' : 'Probably duplicates'}
          </span>
        </div>
        {!isManual ? <InstantUnambiguousMergeButton payload={instantPayload} /> : null}
      </div>
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
        {simpleBadges.map(b => (
          <Badge key={b} variant="secondary" className="text-xs font-normal">
            {mergeSimpleBadgeLabel(b)}
          </Badge>
        ))}
        {displayKeys.length > 0 ? (
          <span className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {displayKeys.join(' · ')}
          </span>
        ) : null}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {isManual ? (
          <>
            You chose these profiles from the customer list. Choose one record to keep; only checked
            profiles take part in this merge (others stay as they are for now).
          </>
        ) : (
          <>
            Check the profiles that are really the same person. Choose one record to keep; only
            checked profiles take part in this merge (others stay as they are for now).
          </>
        )}
      </p>

      <RadioGroup
        value={keepId}
        onValueChange={setKeepId}
        className={cn(
          'grid w-full min-w-0 grid-cols-1 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]'
        )}
      >
        {group.customers.map((c, index) => {
          const cid = c._id ?? '';
          const isIn = Boolean(cid && included[cid]);
          const selected = keepId === c._id;
          const fieldId = `keep-${c._id ?? index}`;
          return (
            <div key={c._id} className={cn('flex min-w-0 gap-3', !isIn && 'opacity-50')}>
              <Checkbox
                id={`in-${fieldId}`}
                checked={isIn}
                onCheckedChange={v => cid && toggleInclude(cid, v === true)}
                className="mt-3 shrink-0"
                aria-label={`Include ${c.name ?? 'profile'} in this merge`}
              />
              <div className="min-w-0 flex-1">
                <RadioGroupItem
                  value={c._id ?? ''}
                  id={fieldId}
                  aria-label={`Keep profile ${c.name ?? ''}`}
                  className="sr-only"
                  disabled={!isIn}
                />
                <Label
                  htmlFor={fieldId}
                  className={cn('block min-w-0', isIn ? 'cursor-pointer' : 'cursor-not-allowed')}
                >
                  <Card
                    className={cn(
                      'border-2 shadow-md transition-[box-shadow,background-color,border-color] duration-150',
                      selected && isIn
                        ? 'border-primary bg-muted ring-2 ring-primary ring-offset-0 shadow-lg'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted'
                    )}
                  >
                    <CardHeader className="space-y-0 p-4 pb-2 pt-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                            {c.name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal">
                              {c.appointmentCount}{' '}
                              {c.appointmentCount === 1 ? 'appointment' : 'appointments'}
                            </Badge>
                          </div>
                        </div>
                        {!isIn ? (
                          <span className="shrink-0 rounded-md border border-muted-foreground/30 bg-muted/80 px-2 py-1 text-xs text-muted-foreground">
                            Excluded
                          </span>
                        ) : selected ? (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                            Keeping
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-md border border-dashed border-muted-foreground/40 bg-muted px-2 py-1 text-xs text-muted-foreground">
                            Will archive
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="min-w-0 space-y-1 px-4 pb-3 pt-0 text-sm text-muted-foreground">
                      {c.email ? <div className="[overflow-wrap:anywhere]">{c.email}</div> : null}
                      {c.phone ? <div>{formatPhone(c.phone)}</div> : null}
                    </CardContent>
                  </Card>
                </Label>
              </div>
            </div>
          );
        })}
      </RadioGroup>

      {keeper && includedCustomers.length >= 2 ? (
        <Form {...form}>
          <div className="mt-4 space-y-3 rounded-md border border-dashed border-warning/30 bg-muted/20 p-3 dark:border-warning/20">
            <p className="text-xs font-medium text-foreground">Saved profile after merge</p>
            <p className="text-xs text-muted-foreground">
              Choose the contact info stored on the kept record and shown on appointments. Mix fields
              from different cards or type your own.
            </p>
            <div className="grid gap-3 sm:grid-cols-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`merge-name-${groupKey}`}>Name</FormLabel>
                    {showNameQuickPicks ? (
                      <div className="flex flex-wrap gap-1">
                        {nameQuickPicks.map(({ name, customer }) => (
                          <Button
                            key={name}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 max-w-full truncate text-xs"
                            title={name}
                            onClick={() => applyProfileFieldFromCustomer(customer, 'name')}
                          >
                            Use “{name.length > 28 ? `${name.slice(0, 28)}…` : name}”
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    <FormControl>
                      <Input
                        id={`merge-name-${groupKey}`}
                        placeholder="Display name"
                        autoComplete="name"
                        {...field}
                        onChange={e =>
                          field.onChange(normalizeCustomerNameWhileTyping(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`merge-email-${groupKey}`}>Email (optional)</FormLabel>
                    {showEmailQuickPicks ? (
                      <div className="flex flex-wrap gap-1">
                        {emailQuickPicks.map(({ normalized, raw, display }) => (
                          <Button
                            key={normalized}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 max-w-full truncate text-xs"
                            title={raw}
                            onClick={() => {
                              form.setValue('email', raw, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }}
                          >
                            Use {display}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    <FormControl>
                      <Input
                        id={`merge-email-${groupKey}`}
                        type="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`merge-phone-${groupKey}`}>Phone (optional)</FormLabel>
                    {showPhoneQuickPicks ? (
                      <div className="flex flex-wrap gap-1">
                        {phoneQuickPicks.map(({ normalized, raw, display }) => (
                          <Button
                            key={normalized}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 max-w-full truncate text-xs"
                            title={raw}
                            onClick={() => {
                              form.setValue('phone', formatPhone(raw), {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }}
                          >
                            Use {display}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    <FormControl>
                      <MaskedTelInput
                        id={`merge-phone-${groupKey}`}
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        disabled={field.disabled}
                        placeholder="555-123-4567"
                        autoComplete="tel"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      ) : null}

      {keeper && mergeTargets.length > 0 ? (
        <MergeOutcomePreview
          keeper={keeper}
          archived={includedCustomers.filter(c => c._id !== keepId)}
          afterMergeName={resultName}
          afterMergeEmail={resultEmail}
          afterMergePhone={resultPhone}
        />
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={openConfirm}
          disabled={mergeTargets.length === 0 || !resultName.trim()}
        >
          Merge into selected
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" onClick={e => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Merge customers?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Appointments for the {mergeTargets.length} selected profile
                  {mergeTargets.length === 1 ? '' : 's'} will link to the kept record. Those
                  profiles will archive (hidden from your list; not permanently erased). Unchecked
                  profiles in this {isManual ? 'group' : 'suggestion'} are unchanged. Undo is not in
                  the UI yet.
                </p>
                <div className="rounded-md border bg-muted/40 p-3 text-foreground">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Saved contact after merge
                  </p>
                  <p className="mt-1 font-medium [overflow-wrap:anywhere]">{resultName.trim()}</p>
                  <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {resultEmail.trim() || 'No email'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {resultPhone.trim() ? formatPhone(resultPhone.trim()) : 'No phone'}
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => mergeMutation.mutate()}
              disabled={mergeMutation.isPending}
            >
              {mergeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging…
                </>
              ) : (
                'Merge'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type CustomerMergeSuggestionsPanelProps = {
  /** When set, only suggestion groups that include this customer id are shown (per-customer merge flow). */
  scopeToCustomerId?: string;
  /**
   * When listing all groups (no scope), only rows matching this signal (same as grid quick filters).
   */
  groupListFilter?: MergeQuickFilter | null;
};

/** Full merge UI for the duplicate profiles page, optionally scoped to one customer. */
const MERGE_LIST_FILTER_LABEL: Record<MergeQuickFilter, string> = {
  phone: 'same phone',
  email: 'same email',
  name: 'same name',
  similar: 'similar name',
  triple: 'phone, name & email (including all-empty email or all-empty phone)',
};

export function CustomerMergeSuggestionsPanel({
  scopeToCustomerId,
  groupListFilter = null,
}: CustomerMergeSuggestionsPanelProps) {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const navigate = useNavigate();
  const { data: suggestions = [], isLoading, isFetched } = useMergeSuggestionsQuery();

  const suggestionsForDirectory = useMemo(() => {
    const base = groupListFilter
      ? suggestions.filter(g => mergeGroupMatchesQuickFilter(g, groupListFilter))
      : suggestions;

    const orderIndex = new Map<string, number>();
    suggestions.forEach((g, i) => {
      orderIndex.set(mergeGroupStableKey(g), i);
    });

    return [...base].sort((a, b) => {
      const instantA = mergeGroupEligibleForInstantUnambiguousMerge(a) ? 1 : 0;
      const instantB = mergeGroupEligibleForInstantUnambiguousMerge(b) ? 1 : 0;
      if (instantB !== instantA) return instantB - instantA;
      return (
        (orderIndex.get(mergeGroupStableKey(a)) ?? 0) -
        (orderIndex.get(mergeGroupStableKey(b)) ?? 0)
      );
    });
  }, [suggestions, groupListFilter]);

  const scopedGroups = useMemo(() => {
    if (!scopeToCustomerId) return [];
    return suggestions.filter(g => g.customers.some(c => c._id === scopeToCustomerId));
  }, [suggestions, scopeToCustomerId]);

  const currentGroup: CustomerMergeSuggestionGroup | null = scopeToCustomerId
    ? (scopedGroups[0] ?? null)
    : null;

  const globalIdx = useMemo(() => {
    if (!currentGroup) return -1;
    const k = mergeGroupStableKey(currentGroup);
    return suggestions.findIndex(g => mergeGroupStableKey(g) === k);
  }, [suggestions, currentGroup]);

  const atGlobalEnd = globalIdx < 0 || globalIdx >= suggestions.length - 1;

  const goPrevious = () => {
    if (!scopeToCustomerId) return;
    if (globalIdx <= 0) {
      navigate('/dashboard/customers/duplicates');
      return;
    }
    const prevId = groupMergeFocusCustomerId(suggestions[globalIdx - 1]);
    if (prevId) navigate(`/dashboard/customers/${prevId}/merge`);
  };

  const goNext = () => {
    if (!scopeToCustomerId) return;
    if (atGlobalEnd) return;
    const nextId = groupMergeFocusCustomerId(suggestions[globalIdx + 1]);
    if (nextId) navigate(`/dashboard/customers/${nextId}/merge`);
  };

  if (!tenantId) {
    return null;
  }

  if (isLoading || !isFetched) {
    return (
      <p className="text-sm text-muted-foreground" aria-busy="true">
        Loading suggestions…
      </p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No duplicate customer groups detected right now. Check back after new bookings, or if some
        rows still look wrong, try editing contact info so phone or email match across profiles.
      </p>
    );
  }

  /** All groups: read-only summaries; merging happens on each group’s `/customers/:id/merge` page. */
  if (!scopeToCustomerId) {
    const dirTotal = suggestionsForDirectory.length;
    const filtered = Boolean(groupListFilter);
    return (
      <div
        className="mx-auto w-full min-w-0 max-w-3xl space-y-4 pb-8 pt-1"
        aria-label="All customer merge suggestion groups"
      >
        <p className="border-b border-border/60 pb-3 text-sm text-muted-foreground">
          {filtered && groupListFilter ? (
            <>
              Showing{' '}
              <span className="font-medium tabular-nums text-foreground">{dirTotal}</span> of{' '}
              <span className="tabular-nums text-foreground">{suggestions.length}</span> groups
              matching{' '}
              <span className="font-medium">{MERGE_LIST_FILTER_LABEL[groupListFilter]}</span>
              .{' '}
              <Link
                to="/dashboard/customers/duplicates"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Show all groups
              </Link>
              . Open a row to choose who to keep and merge.
            </>
          ) : (
            <>
              <span className="font-medium tabular-nums text-foreground">{suggestions.length}</span>{' '}
              suggested {suggestions.length === 1 ? 'group' : 'groups'}. Groups with{' '}
              <span className="font-medium text-foreground">Merge now</span> are listed first; then
              stronger matches (phone / email) from the server order.
            </>
          )}
        </p>
        {dirTotal === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups match this filter right now.{' '}
            <Link
              to="/dashboard/customers/duplicates"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              View all duplicate groups
            </Link>
            .
          </p>
        ) : (
          suggestionsForDirectory.map((group, i) => (
            <DuplicateGroupOverviewRow
              key={mergeGroupStableKey(group)}
              group={group}
              index={i}
              total={dirTotal}
            />
          ))
        )}
      </div>
    );
  }

  if (scopedGroups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This profile is not in any duplicate group right now. You can still review all suggestions
        from the customer list.
      </p>
    );
  }

  if (!currentGroup) {
    return null;
  }

  const blockKey = mergeGroupStableKey(currentGroup);
  const duplicatePositionLabel =
    globalIdx >= 0 ? (
      <span className="tabular-nums">
        Duplicate {globalIdx + 1} of {suggestions.length}
      </span>
    ) : (
      <span className="tabular-nums">Duplicate group</span>
    );

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-3xl pb-8 pt-1"
      aria-label="Customer merge suggestions"
    >
      <div className="flex flex-col gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-foreground">
          {duplicatePositionLabel}
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
            Phone → email → name-only. Use Previous / Next to open each group on its own page.
          </span>
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={globalIdx < 0}
            onClick={goPrevious}
            aria-label={globalIdx <= 0 ? 'View all duplicate groups' : 'Previous duplicate group'}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            {globalIdx <= 0 ? 'All groups' : 'Previous'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={atGlobalEnd}
            onClick={goNext}
            aria-label="Next duplicate group"
          >
            Next duplicate
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="mt-3 min-w-0">
        <MergeSuggestionBlock
          key={blockKey}
          group={currentGroup}
          preferredKeepCustomerId={scopeToCustomerId}
        />
      </div>
    </div>
  );
}
