import { cn } from '@/lib/utils';
import { colorPickerOptions } from '@/components/resources/colors';
import { useMemo } from 'react';

interface ColorSelectorProps {
  value?: string;
  onChange: (color: string) => void;
  /** Smaller swatches and no heading — use when the parent already labels the field. */
  compact?: boolean;
}

export function ColorPicker({ value, onChange, compact = false }: ColorSelectorProps) {
  const Buttons = useMemo(() => {
    return colorPickerOptions.map(({ name, colors }) => (
      <button
        type="button"
        key={name}
        className={cn(
          'rounded-none border-2',
          compact ? 'h-8 w-8' : 'h-12 w-12',
          colors.background,
          colors.border,
          value === name ? 'ring-2 ring-offset-0 ring-foreground' : ''
        )}
        onClick={() => onChange(name)}
        aria-label={`Select ${name}`}
      />
    ));
  }, [compact, value, onChange]);

  return (
    <div className={cn(!compact && 'p-4')}>
      {!compact ? (
        <h2 className="mb-2 text-lg font-semibold">Select a color:</h2>
      ) : null}
      <div className={cn('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>{Buttons}</div>
    </div>
  );
}
