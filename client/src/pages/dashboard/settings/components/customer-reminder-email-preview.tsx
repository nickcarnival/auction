import {
  REMINDER_EMAIL_FROM,
  REMINDER_PREVIEW_SAMPLE_TO_EMAIL,
} from '@shared/customer-reminder';
import { Forward, Reply } from 'lucide-react';

type CustomerReminderEmailPreviewProps = {
  /** Same subject line the server sends (e.g. from `buildReminderEmailSubject`). */
  subject: string;
  /** HTML from `buildReminderEmailHtml`. */
  bodyHtml: string;
  /** Shown after “to” in the faux inbox header; reminder sends to the appointment email. */
  toPreviewEmail?: string;
};

function formatReceivedAt(date: Date): string {
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${time} (just now)`;
}

/**
 * Read-only chrome that approximates a webmail thread (sender row, subject, body, action bar)
 * so the Operations settings preview matches what customers see more closely than raw HTML.
 */
export function CustomerReminderEmailPreview({
  subject,
  bodyHtml,
  toPreviewEmail = REMINDER_PREVIEW_SAMPLE_TO_EMAIL,
}: CustomerReminderEmailPreviewProps) {
  const receivedAt = new Date();

  return (
    <div className="overflow-clip rounded-lg border border-border bg-email-preview dark:bg-muted/50">
      <div className="border-b border-border bg-white px-4 py-3 dark:bg-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{REMINDER_EMAIL_FROM}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              to {toPreviewEmail}
            </p>
          </div>
          <time
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            dateTime={receivedAt.toISOString()}
          >
            {formatReceivedAt(receivedAt)}
          </time>
        </div>
        <p className="mt-3 border-t border-border/70 pt-3 text-sm font-medium leading-snug text-foreground">
          {subject}
        </p>
      </div>

      <div className="bg-white px-4 py-4 dark:bg-background">
        <div
          className="customer-reminder-email-body text-left"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>

      <div className="flex gap-2 border-t border-border bg-white px-4 py-2.5 dark:bg-card">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          <Reply className="h-3.5 w-3.5" aria-hidden />
          Reply
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          <Forward className="h-3.5 w-3.5" aria-hidden />
          Forward
        </span>
      </div>
    </div>
  );
}
