import type { CreateEmailResponseSuccess } from 'resend';

import { Resend } from 'resend';
import { getEnv } from '@/utils/get-env';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type BookingRequestEmailParams = {
  shopName: string;
  customerName: string;
  preferredDropoff?: string;
  preferredPickup?: string;
  vehicle?: string;
  comments?: string;
  shopPhone?: string;
};

export const EMAIL_TEMPLATES = {
  bookingRequestReceived: (p: BookingRequestEmailParams) => {
    const shop = escapeHtml(p.shopName);
    const who = escapeHtml(p.customerName);
    const rows: string[] = [];
    if (p.preferredDropoff) {
      rows.push(
        `<tr><td style="padding:8px 12px;border:1px solid #eee;"><strong>Preferred drop-off</strong></td><td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(p.preferredDropoff)}</td></tr>`
      );
    }
    if (p.preferredPickup) {
      rows.push(
        `<tr><td style="padding:8px 12px;border:1px solid #eee;"><strong>Preferred pickup</strong></td><td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(p.preferredPickup)}</td></tr>`
      );
    }
    if (p.vehicle?.trim()) {
      rows.push(
        `<tr><td style="padding:8px 12px;border:1px solid #eee;"><strong>Vehicle</strong></td><td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(p.vehicle.trim())}</td></tr>`
      );
    }
    if (p.comments?.trim()) {
      rows.push(
        `<tr><td style="padding:8px 12px;border:1px solid #eee;vertical-align:top;"><strong>Notes</strong></td><td style="padding:8px 12px;border:1px solid #eee;">${escapeHtml(p.comments.trim())}</td></tr>`
      );
    }
    const tableBlock =
      rows.length > 0
        ? `<table style="border-collapse:collapse;width:100%;max-width:560px;margin:16px 0;">${rows.join('')}</table>`
        : '';
    const phoneBlock = p.shopPhone?.trim()
      ? `<p style="margin:16px 0 0;">Questions? Call us at <strong>${escapeHtml(p.shopPhone.trim())}</strong>.</p>`
      : '';
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2c3e50;">We received your service request</h2>
        <p>Hi ${who},</p>
        <p>Thank you for contacting <strong>${shop}</strong>. The details you submitted are below, and the team will review them shortly.</p>
        <p><strong>This is not a confirmed appointment.</strong> You’ll have a time on the calendar only after the shop reaches out and confirms with you.</p>
        ${tableBlock}
        ${phoneBlock}
        <p style="margin-top:20px;">— <strong>${shop}</strong> (via Plandry)</p>
      </div>
    `;
  },
  invite: (tenantName: string, url: string) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Verify Your Email Address</h2>
        <p>Hello,</p>
        <p>Thank you for signing up for <strong>Plandry</strong> with <strong>${tenantName}</strong>!</p>
        <p>To complete your account setup and start using the platform, please verify your email address by clicking the button below:</p>
        <p style="text-align: center;">
          <a href="${url}"
             style="background-color: #3B82F6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block; font-weight: bold;">Verify Email Address</a>
        </p>
        <p>This verification link will expire in 24 hours for security purposes.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>Welcome to Plandry!</p>
      </div>
    `,
  passwordReset: (url: string) => `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #2c3e50;">Reset your password</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your <strong>Plandry</strong> account.</p>
        <p style="text-align: center;">
          <a href="${url}"
             style="background-color: #3B82F6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block; font-weight: bold;">Choose a new password</a>
        </p>
        <p>This link expires in <strong>1 hour</strong>. If you didn’t ask for this, you can ignore this email—your password will stay the same.</p>
      </div>
    `,
};

type SendEmailParams = {
  from: 'Plandry <invites@plandry.org>' | 'Plandry <reminders@plandry.org>';
  subject: string;
  to: string[];
  html: string;
};

export const sendEmail = async ({
  to,
  subject,
  from,
  html,
}: SendEmailParams): Promise<CreateEmailResponseSuccess | null> => {
  const { RESEND_API } = getEnv();

  const resend = new Resend(RESEND_API);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error('Error sending email', error);
    return null;
  }

  return data;
};
