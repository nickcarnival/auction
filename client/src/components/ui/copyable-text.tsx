import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

/** Ellipsis length for toast preview (avoid huge email bodies in the toast). */
const COPIED_TOAST_PREVIEW_MAX = 56;

function previewForCopiedToast(value: string): string {
  if (value.length <= COPIED_TOAST_PREVIEW_MAX) {
    return value;
  }
  return `${value.slice(0, COPIED_TOAST_PREVIEW_MAX - 1)}…`;
}

export type CopyableTextProps = {
  /** Value written to the clipboard. */
  copyText: string;
  /** Visible, selectable content (e.g. formatted phone). Defaults to `copyText` when omitted. */
  children?: ReactNode;
  className?: string;
  /** Shown when `copyText` is empty after trim. */
  emptyLabel?: ReactNode;
  /** `aria-label` for the copy control. */
  copyLabel?: string;
};

/**
 * Inline selectable text with a small copy button. Clicks on the button do not bubble (safe inside
 * clickable table rows).
 */
export function CopyableText({
  copyText,
  children,
  className,
  emptyLabel = '—',
  copyLabel = 'Copy to clipboard',
}: CopyableTextProps) {
  const trimmed = copyText.trim();
  if (!trimmed) {
    return (
      <span className={cn('text-sm leading-tight text-muted-foreground', className)}>{emptyLabel}</span>
    );
  }

  return (
    <div
      className={cn(
        'flex w-fit max-w-full min-w-0 items-start gap-1 text-sm leading-tight',
        className
      )}
      onClick={e => e.stopPropagation()}
    >
      <span className="min-w-0 select-text break-words">{children ?? copyText}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-px h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={copyLabel}
        onClick={async e => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(trimmed);
            toast.success(`Copied: ${previewForCopiedToast(trimmed)}`);
          } catch {
            toast.error('Could not copy');
          }
        }}
      >
        <Copy className="size-3" aria-hidden />
      </Button>
    </div>
  );
}
