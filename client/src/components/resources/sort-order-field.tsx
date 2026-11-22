import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MIN_ORDER = 1;

function parseOrderInput(raw: string, maxSlot: number): number | undefined {
  const t = raw.trim();
  if (t === '') {
    return undefined;
  }
  const n = Number(t);
  if (!Number.isInteger(n) || n < MIN_ORDER || n > maxSlot) {
    return undefined;
  }
  return n;
}

export interface SortOrderFieldProps {
  id?: string;
  labelClassName?: string;
  value: number | undefined;
  /** Upper slot (inclusive). Defaults to no cap beyond integer parsing. */
  maxSlot?: number;
  onChange: (next: number) => void;
  /** After − / + or blur/Enter when the value actually changes (e.g. batch save). */
  onInstantPersist?: (next: number) => void | Promise<void>;
  disabled?: boolean;
  error?: string | null;
}

/**
 * Sort order: integer ≥ 1, optional max slot. Type (blur / Enter) or − / +.
 */
export function SortOrderField({
  id,
  labelClassName,
  value,
  maxSlot = Number.MAX_SAFE_INTEGER,
  onChange,
  onInstantPersist,
  disabled,
  error,
}: SortOrderFieldProps) {
  const [text, setText] = useState(() => (value === undefined ? '' : String(value)));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(value === undefined ? '' : String(value));
    }
  }, [value]);

  const commit = (raw: string) => {
    const parsed = parseOrderInput(raw, maxSlot);
    if (raw.trim() === '') {
      setText(value === undefined ? '' : String(value));
      return;
    }
    if (parsed === undefined) {
      setText(value === undefined ? '' : String(value));
      return;
    }
    if (parsed !== value) {
      onChange(parsed);
      void Promise.resolve(onInstantPersist?.(parsed));
    }
    setText(String(parsed));
  };

  const bump = (delta: number) => {
    let n = parseOrderInput(text, maxSlot);
    if (n === undefined) {
      if (value !== undefined && value >= MIN_ORDER) {
        n = value;
      } else {
        n = MIN_ORDER - delta;
      }
    }
    const next = Math.max(MIN_ORDER, Math.min(maxSlot, n + delta));
    setText(String(next));
    if (next !== value) {
      onChange(next);
      void Promise.resolve(onInstantPersist?.(next));
    }
  };

  const atMin = value !== undefined && value <= MIN_ORDER;
  const atMax = value !== undefined && value >= maxSlot;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelClassName}>
        Sort order
      </Label>
      <div className="flex w-fit max-w-full items-center gap-0.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled || atMin}
          aria-label="Decrease sort order"
          onMouseDown={e => e.preventDefault()}
          onClick={() => bump(-1)}
        >
          <Minus className="size-3.5" aria-hidden />
        </Button>
        <Input
          id={id}
          type="number"
          min={MIN_ORDER}
          max={maxSlot < Number.MAX_SAFE_INTEGER ? maxSlot : undefined}
          step={1}
          inputMode="numeric"
          disabled={disabled}
          value={text}
          className={cn(
            'h-8 w-14 shrink-0 px-1 text-center text-sm tabular-nums md:w-[4.25rem]',
            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
          )}
          aria-invalid={error != null}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onChange={e => {
            setText(e.target.value);
          }}
          onBlur={() => {
            focusedRef.current = false;
            commit(text);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled || atMax}
          aria-label="Increase sort order"
          onMouseDown={e => e.preventDefault()}
          onClick={() => bump(1)}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
