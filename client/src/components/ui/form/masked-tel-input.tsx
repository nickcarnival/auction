import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatPhone } from '@shared/phone-utils';
import * as React from 'react';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { ComponentProps } from 'react';

export type MaskedTelInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'onChange' | 'maxLength' | 'value'
> & {
  value: string;
  onChange: (value: string) => void;
};

/** Place caret after `digitsBeforeCursor` digits in `formatted` (0 = before first digit). */
function cursorAfterDigits(formatted: string, digitsBeforeCursor: number): number {
  if (digitsBeforeCursor <= 0) return 0;
  let counted = 0;
  let index = 0;
  for (const ch of formatted) {
    if (/\d/.test(ch)) {
      counted++;
      if (counted === digitsBeforeCursor) {
        return index + 1;
      }
    }
    index++;
  }
  return formatted.length;
}

/** US-style digit entry formatted as `XXX-XXX-XXXX` (same as appointment `PhoneField`). */
export const MaskedTelInput = React.forwardRef<HTMLInputElement, MaskedTelInputProps>(
  function MaskedTelInput({ value, onChange, className, onKeyDown, ...rest }, ref) {
    const innerRef = useRef<HTMLInputElement>(null);
    const pendingCursor = useRef<number | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    useLayoutEffect(() => {
      const el = innerRef.current;
      const pos = pendingCursor.current;
      pendingCursor.current = null;
      if (el && pos !== null && document.activeElement === el) {
        const clamped = Math.max(0, Math.min(pos, el.value.length));
        el.setSelectionRange(clamped, clamped);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const selStart = e.target.selectionStart ?? raw.length;
      const digitsBefore = raw.slice(0, selStart).replace(/\D/g, '').length;
      const formatted = formatPhone(raw);
      pendingCursor.current = cursorAfterDigits(formatted, digitsBefore);
      onChange(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      if (e.key !== 'Backspace') return;
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === null || end === null || start !== end || start === 0) return;

      const v = el.value;
      if (v[start - 1] !== '-') return;

      e.preventDefault();
      const digits = v.replace(/\D/g, '');
      const digitCountBefore = v.slice(0, start).replace(/\D/g, '').length;
      if (digitCountBefore <= 0) return;

      const newDigits = digits.slice(0, digitCountBefore - 1) + digits.slice(digitCountBefore);
      const formatted = formatPhone(newDigits);
      pendingCursor.current = cursorAfterDigits(formatted, digitCountBefore - 1);
      onChange(formatted);
    };

    return (
      <Input
        ref={setRefs}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={12}
        className={cn('transition-all duration-300', className)}
        {...rest}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    );
  }
);
MaskedTelInput.displayName = 'MaskedTelInput';
