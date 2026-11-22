import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type YesNoSegmentProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  'aria-label': string;
  className?: string;
  /** Icons before Yes / No labels (appointment modal presets, etc.). */
  icons?: { yes: LucideIcon; no: LucideIcon };
};

/**
 * Compact Yes / No segmented control (square corners, matches appointment modal fields).
 */
export function YesNoSegment({
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
  icons,
}: YesNoSegmentProps) {
  const yes = Boolean(value);
  const YesIcon = icons?.yes;
  const NoIcon = icons?.no;
  const rowSize = icons ? 'h-7 min-h-7' : 'h-6 min-h-6';
  const btnClass = cn(
    'flex flex-1 appearance-none items-center justify-center gap-1 rounded-none px-1.5 text-xs font-medium leading-none transition-colors',
    rowSize
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full divide-x divide-input overflow-hidden rounded-sm border border-input',
        className
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={yes}
        className={cn(
          btnClass,
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset',
          yes
            ? 'bg-success text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
        onClick={() => onChange(true)}
      >
        {YesIcon ? <YesIcon className="size-3 shrink-0" aria-hidden /> : null}
        Yes
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!yes}
        className={cn(
          btnClass,
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset',
          !yes
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
        onClick={() => onChange(false)}
      >
        {NoIcon ? <NoIcon className="size-3 shrink-0" aria-hidden /> : null}
        No
      </button>
    </div>
  );
}
