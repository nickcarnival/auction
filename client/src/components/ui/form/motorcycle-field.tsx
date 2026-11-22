import { Input } from '@/components/ui/input';
import { BOOKING_FORM_AUTOCOMPLETE } from '@/components/booking/booking-form-autocomplete';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { filterMotorcycleSuggestions } from '@/lib/motorcycle-suggestions';
import { getMotorcycleYearModelPlaceholder } from '@/lib/motorcycle-year-model-placeholder';
import { cn } from '@/lib/utils';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ControllerRenderProps, FieldValues, Path, UseFormReturn } from 'react-hook-form';

const DEFAULT_LABEL: ReactNode = (
  <span>
    Motorcycle <span className="text-muted-foreground">(year and model)</span>
  </span>
);

export type MotorcycleFieldProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  /** Form field for year + model text. Default matches booking schema `vehicle`. */
  name?: Path<T>;
  label?: ReactNode;
  /**
   * Fixed placeholder. If omitted, a random year+model is chosen on mount and again each
   * time the user focuses the field.
   */
  placeholder?: string;
  autoComplete?: string;
  /**
   * Hints password managers to skip (free text, not a login). Default true, matching
   * the old booking `vehicle` field.
   */
  dataLpIgnore?: boolean;
  className?: string;
};

type InnerProps<T extends FieldValues> = {
  field: ControllerRenderProps<T, Path<T>>;
  label: ReactNode;
  placeholder: string;
  usesRollingPlaceholder: boolean;
  autoComplete: string;
  extensionHints: Record<string, unknown>;
  className: string | undefined;
  setRollingPlaceholder: (s: string) => void;
};

function MotorcycleFieldAutocompleteInner<T extends FieldValues>({
  field,
  label,
  placeholder,
  usesRollingPlaceholder,
  autoComplete,
  extensionHints,
  className,
  setRollingPlaceholder,
}: InnerProps<T>) {
  const listId = useId();
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const valueStr = String(field.value ?? '');
  const suggestions = useMemo(() => filterMotorcycleSuggestions(valueStr), [valueStr]);

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current != null) clearTimeout(blurCloseTimer.current);
    };
  }, []);

  const clearBlurTimer = () => {
    if (blurCloseTimer.current != null) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  };

  const scheduleCloseMenu = () => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => setMenuOpen(false), 120);
  };

  const showSuggestions =
    menuOpen && valueStr.trim().length > 0 && suggestions.length > 0;

  return (
    <FormItem className={cn('w-full', className)}>
      <FormLabel className="text-inherit">{label}</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            placeholder={placeholder}
            autoComplete={autoComplete}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-controls={showSuggestions ? listId : undefined}
            aria-autocomplete="list"
            {...extensionHints}
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onChange={e => {
              field.onChange(e.target.value);
              setMenuOpen(true);
            }}
            onFocus={e => {
              clearBlurTimer();
              setMenuOpen(true);
              if (usesRollingPlaceholder) {
                setRollingPlaceholder(getMotorcycleYearModelPlaceholder());
              }
              field.onFocus?.(e);
            }}
            onBlur={e => {
              scheduleCloseMenu();
              field.onBlur?.(e);
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setMenuOpen(false);
              }
            }}
          />
          {showSuggestions ? (
            <div
              id={listId}
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg"
              role="listbox"
              aria-label="Harley-Davidson model suggestions"
            >
              {suggestions.map(suggestion => (
                <div
                  key={suggestion}
                  role="option"
                  className="cursor-pointer px-2.5 py-2 text-sm [overflow-wrap:anywhere] hover:bg-muted"
                  onMouseDown={e => {
                    e.preventDefault();
                    clearBlurTimer();
                    field.onChange(suggestion);
                    setMenuOpen(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

/**
 * Combobox-style input for “year and model” motorcycle text (public booking + new request +
 * appointments). Suggestions come from the curated Harley-Davidson-by-year list; any custom text
 * remains valid.
 *
 * **Data model:** Updating this field changes the appointment/request `vehicle` string only. It does
 * not add columns on the customer row (customers store contact fields). Customer profile “Vehicles”
 * lists are derived from linked appointments.
 */
export function MotorcycleField<T extends FieldValues>({
  form,
  name = 'vehicle' as Path<T>,
  label = DEFAULT_LABEL,
  placeholder: placeholderProp,
  autoComplete = BOOKING_FORM_AUTOCOMPLETE.vehicle,
  dataLpIgnore = true,
  className,
}: MotorcycleFieldProps<T>) {
  const [rollingPlaceholder, setRollingPlaceholder] = useState(getMotorcycleYearModelPlaceholder);
  const placeholder = placeholderProp ?? rollingPlaceholder;
  const usesRollingPlaceholder = placeholderProp === undefined;

  const extensionHints = dataLpIgnore
    ? ({
        'data-lpignore': 'true',
        'data-1p-ignore': true,
      } as const)
    : ({} as const);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <MotorcycleFieldAutocompleteInner<T>
          field={field}
          label={label}
          placeholder={placeholder}
          usesRollingPlaceholder={usesRollingPlaceholder}
          autoComplete={autoComplete}
          extensionHints={extensionHints}
          className={className}
          setRollingPlaceholder={setRollingPlaceholder}
        />
      )}
    />
  );
}
