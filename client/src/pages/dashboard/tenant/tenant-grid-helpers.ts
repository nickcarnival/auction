import type { ShopHours, Tenant } from '@shared/tenant';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatShopHoursPreview(sh: ShopHours | undefined): string {
  if (!sh || !Array.isArray(sh.daysOpen)) return '—';
  const days = [...sh.daysOpen]
    .sort((a, b) => a - b)
    .map(d => WEEKDAY_SHORT[d] ?? String(d))
    .join(', ');
  return `${days} · ${sh.openHour}:00–${sh.closeHour}:00`;
}

function formatTenantCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Ordered fields + any additional keys on the document (e.g. Mongo dates). */
const DELETE_CONFIRM_PRIMARY_KEYS: readonly string[] = [
  '_id',
  'name',
  'businessName',
  'subdomain',
  'tier',
  'trial',
  'billingExempt',
  'subscriptionStatus',
  'subscriptionCurrentPeriodEnd',
  'trialEndsAt',
  'stripePriceId',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'active',
  'email',
  'phone',
  'redirectUrl',
  'lastLogin',
  'shopHours',
  'createdDate',
  'updatedDate',
];

export function buildDeleteConfirmRows(tenant: Tenant): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const record = tenant as Record<string, unknown>;
  const primary = new Set(DELETE_CONFIRM_PRIMARY_KEYS);

  for (const key of DELETE_CONFIRM_PRIMARY_KEYS) {
    if (key === 'shopHours') {
      rows.push({ label: key, value: formatShopHoursPreview(tenant.shopHours) });
      continue;
    }
    if (key === 'subscriptionCurrentPeriodEnd' || key === 'trialEndsAt') {
      const raw = record[key];
      if (typeof raw !== 'string' || !raw.trim()) {
        rows.push({ label: key, value: '—' });
      } else {
        try {
          rows.push({ label: key, value: format(parseISO(raw), 'MMM d, yyyy') });
        } catch {
          rows.push({ label: key, value: formatTenantCell(raw) });
        }
      }
      continue;
    }
    rows.push({ label: key, value: formatTenantCell(record[key]) });
  }

  for (const key of Object.keys(record).sort()) {
    if (primary.has(key)) continue;
    rows.push({ label: key, value: formatTenantCell(record[key]) });
  }

  return rows;
}

export function tenantExtraFieldsJson(tenant: Tenant): string {
  const r = tenant as Record<string, unknown>;
  const primary = new Set(DELETE_CONFIRM_PRIMARY_KEYS);
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (!primary.has(k)) extra[k] = v;
  }
  if (Object.keys(extra).length === 0) return '—';
  try {
    return JSON.stringify(extra);
  } catch {
    return '—';
  }
}

/** Table columns after `_id` and `active`. */
export const GRID_DETAIL_KEYS = [
  'name',
  'businessName',
  'subdomain',
  'tier',
  'trial',
  'billingExempt',
  'subscriptionStatus',
  'subscriptionCurrentPeriodEnd',
  'trialEndsAt',
  'stripePriceId',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'email',
  'phone',
  'redirectUrl',
  'lastLogin',
  'shopHours',
  'createdDate',
  'updatedDate',
] as const;

export type GridDetailKey = (typeof GRID_DETAIL_KEYS)[number];

export function gridDetailCell(tenant: Tenant, key: GridDetailKey): string {
  const r = tenant as Record<string, unknown>;
  if (key === 'shopHours') return formatShopHoursPreview(tenant.shopHours);
  if (key === 'subscriptionCurrentPeriodEnd' || key === 'trialEndsAt') {
    const raw = r[key];
    if (typeof raw !== 'string' || !raw.trim()) return '—';
    try {
      return format(parseISO(raw), 'MMM d, yyyy');
    } catch {
      return formatTenantCell(raw);
    }
  }
  return formatTenantCell(r[key]);
}

export function gridColumnClass(key: GridDetailKey): string {
  switch (key) {
    case 'email':
      return 'min-w-[14rem] max-w-[18rem] whitespace-normal break-words';
    case 'name':
    case 'businessName':
      return 'min-w-[10rem] max-w-[16rem] whitespace-normal break-words';
    case 'phone':
      return 'min-w-[9rem] whitespace-normal break-words';
    case 'redirectUrl':
      return 'min-w-[12rem] max-w-[18rem] whitespace-normal break-words';
    case 'shopHours':
      return 'min-w-[16rem] max-w-[22rem] whitespace-normal break-words';
    case 'subdomain':
    case 'tier':
    case 'trial':
    case 'billingExempt':
    case 'subscriptionStatus':
    case 'subscriptionCurrentPeriodEnd':
    case 'trialEndsAt':
    case 'lastLogin':
    case 'createdDate':
    case 'updatedDate':
      return 'min-w-[8.5rem] whitespace-normal break-words';
    case 'stripePriceId':
    case 'stripeCustomerId':
    case 'stripeSubscriptionId':
      return 'min-w-[12rem] max-w-[20rem] font-mono text-xs whitespace-normal break-all';
    default:
      return 'min-w-[8rem] whitespace-normal break-words';
  }
}

const thBase =
  'h-auto px-3 py-2.5 text-left text-sm font-semibold leading-snug text-muted-foreground align-bottom';
const tdBase = 'px-3 py-2.5 text-sm align-top leading-snug text-foreground';

export const tenantGridTableClassNames = {
  thBase,
  tdBase,
  thId: cn(thBase, 'min-w-[13rem] font-mono text-xs uppercase tracking-wide'),
  tdId: cn(tdBase, 'min-w-[13rem] max-w-[16rem] font-mono text-xs leading-normal'),
  thActive: cn(thBase, 'min-w-[5rem] text-center'),
  tdActive: cn(tdBase, 'min-w-[5rem] text-center'),
  thExtra: cn(thBase, 'min-w-[14rem] max-w-md'),
  tdExtra: cn(tdBase, 'min-w-[14rem] max-w-md whitespace-normal break-words'),
  thSticky: cn(
    thBase,
    'sticky right-0 z-20 w-28 min-w-28 max-w-28 shrink-0 border-l border-border bg-muted/95 text-right shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.18)]'
  ),
  tdSticky: cn(
    tdBase,
    'sticky right-0 z-10 w-28 min-w-28 max-w-28 shrink-0 border-l border-border bg-card text-right shadow-[-8px_0_12px_-8px_hsl(var(--foreground)/0.18)]'
  ),
} as const;
