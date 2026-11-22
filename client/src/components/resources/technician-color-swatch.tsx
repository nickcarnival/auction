import { getClassName } from '@/components/resources/colors';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  xs: 'size-2',
  sm: 'size-2.5',
  md: 'size-3',
} as const;

export type TechnicianColorSwatchSize = keyof typeof SIZE_CLASS;

interface TechnicianColorSwatchProps {
  /** Resource palette key (“Blue”, “Purple”, …). Empty / absent = border-only cue (matches legacy pickers). */
  colorKey?: string | null;
  /** Default aligns with technician select rows and hover metadata. */
  size?: TechnicianColorSwatchSize;
  className?: string;
}

/**
 * Small square chroma for “which technician owns this”: schedule context, selects, hover cards, side nav.
 * Uses fixed `rounded-[3px]` here — theme `rounded-sm` is overridden to **6px**, which reads as circles on chips
 * as small as `size-3` / `size-2.5`.
 */
export function TechnicianColorSwatch({
  colorKey,
  size = 'md',
  className,
}: TechnicianColorSwatchProps) {
  const key = typeof colorKey === 'string' ? colorKey.trim() : '';
  const background = key !== '' ? getClassName(colorKey ?? undefined).background : undefined;

  return (
    <span
      className={cn(
        'shrink-0 rounded-[3px] border border-border/60',
        SIZE_CLASS[size],
        background,
        className
      )}
      aria-hidden
    />
  );
}
