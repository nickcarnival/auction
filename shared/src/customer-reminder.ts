import type { Tenant } from './tenant';

/**
 * Single source of truth for customer drop-off reminder emails:
 * subject line, HTML body, and validation helpers. Server send + client preview import from here.
 */

/** Resend `from` for appointment reminders (must match verified sender domain). */
export const REMINDER_EMAIL_FROM = 'Plandry <reminders@plandry.org>' as const;

/** Sample copy for the in-app preview when no appointment exists. */
export const REMINDER_PREVIEW_SAMPLE_CUSTOMER_NAME = 'Jordan Smith';

/** Sample “To” address shown only in the dashboard inbox-style preview. */
export const REMINDER_PREVIEW_SAMPLE_TO_EMAIL = 'jordan.smith@example.com';

export const REMINDER_PREVIEW_PLACEHOLDER_SHOP = 'Your business name';

export const REMINDER_PREVIEW_PLACEHOLDER_PHONE = '(your business phone)';

/** Path to dashboard business settings (relative app route). */
/** Tenant business profile (name, phone, email) lives under Operations. */
export const DASHBOARD_BUSINESS_SETTINGS_PATH = '/dashboard/settings/operations';

/**
 * Email subject for the customer reminder (same string the server sends via Resend).
 */
export function buildReminderEmailSubject(shopName: string): string {
  const safe = shopName.replace(/[\r\n]/g, ' ').trim() || 'your shop';
  return `Reminder for your upcoming appointment with ${safe}`;
}

export type ReminderTenantBlocker = 'name' | 'phone' | 'email';

export const REMINDER_TENANT_FIELD_LABELS: Record<ReminderTenantBlocker, string> = {
  name: 'Business name',
  phone: 'Business phone',
  email: 'Business email',
};

export type RemindAppointmentResult =
  | { ok: true }
  | { ok: false; reason: 'no_appointment_email' }
  | { ok: false; reason: 'appointment_not_found' }
  | { ok: false; reason: 'tenant_incomplete'; missing: ReminderTenantBlocker[] };

function isNonEmptyString(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Tenant fields required before {@link sendEmail} reminder flow can run (matches server checks).
 */
export function getReminderTenantBlockers(
  tenant: Partial<Tenant> | null | undefined
): ReminderTenantBlocker[] {
  if (!tenant) {
    return ['name', 'phone', 'email'];
  }

  const missing: ReminderTenantBlocker[] = [];
  if (!isNonEmptyString(tenant.name)) {
    missing.push('name');
  }
  if (!isNonEmptyString(tenant.phone)) {
    missing.push('phone');
  }
  if (!isNonEmptyString(tenant.email)) {
    missing.push('email');
  }
  return missing;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ReminderEmailPreviewParams {
  shopName: string;
  customerName: string;
  dropOffLabel: string;
  shopPhone: string;
}

/**
 * HTML body for the customer drop-off reminder (shared by Resend send and in-app preview).
 */
export function buildReminderEmailHtml({
  shopName,
  customerName,
  dropOffLabel,
  shopPhone,
}: ReminderEmailPreviewParams): string {
  const safeShop = escapeHtml(shopName);
  const safeCustomer = escapeHtml(customerName);
  const safeWhen = escapeHtml(dropOffLabel);
  const safePhone = escapeHtml(shopPhone);

  // Explicit inline styles on every node: Tailwind preflight (in-app preview) and many
  // email clients neutralize heading/paragraph semantics unless size/weight/margin are inline.
  return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #dddddd; border-radius: 5px; box-sizing: border-box;">
  <h2 style="font-size: 22px; font-weight: 700; line-height: 1.3; color: #2c3e50; margin: 0 0 16px 0;">Bike Dropoff With ${safeShop}</h2>
  <p style="margin: 0 0 12px 0;">Hello, ${safeCustomer}</p>
  <p style="margin: 0 0 12px 0;">You are scheduled to drop off your bike with ${safeShop}</p>
  <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #2c3e50;">${safeWhen}</p>
  <p style="margin: 0 0 12px 0;">If you need to reschedule or have any questions, please call:</p>
  <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #2c3e50;">${safePhone}</p>
  <p style="margin: 0;">Thank you!</p>
</div>
`;
}
