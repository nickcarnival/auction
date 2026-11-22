import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form/form';
import { type ComponentProps, ReactNode } from 'react';
import { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

type GenericFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: ReactNode;
  placeholder: string;
  form: UseFormReturn<T>;
  type?: string;
  isHighlighted?: boolean;
  /** HTML autocomplete hint (e.g. `name`, `section-booking email`). */
  autoComplete?: string;
  inputMode?: ComponentProps<'input'>['inputMode'];
  /** e.g. customer name preview — server still normalizes on submit. */
  transformOnChange?: (value: string) => string;
};

export function GenericField<W extends FieldValues>({
  form,
  label,
  name,
  placeholder,
  type = 'text',
  isHighlighted = false,
  autoComplete,
  inputMode,
  transformOnChange,
}: GenericFieldProps<W>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel className="text-inherit">{label}</FormLabel>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              onChange={e =>
                field.onChange(transformOnChange ? transformOnChange(e.target.value) : e.target.value)
              }
              autoComplete={autoComplete}
              inputMode={inputMode}
              className={cn(
                'transition-all duration-300',
                isHighlighted && 'ring-2 ring-primary ring-offset-0'
              )}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
