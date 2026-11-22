import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form/form';
import { MaskedTelInput } from '@/components/ui/form/masked-tel-input';
import { ReactNode, useEffect } from 'react';
import { FieldValues, Path, UseFormReturn, PathValue } from 'react-hook-form';
import { formatPhone } from '@shared/phone-utils';
import { cn } from '@/lib/utils';

type PhoneFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: ReactNode;
  placeholder: string;
  form: UseFormReturn<T>;
  isHighlighted?: boolean;
  autoComplete?: string;
  id?: string;
};

export function PhoneField<W extends FieldValues>({
  form,
  label,
  name,
  placeholder,
  isHighlighted = false,
  autoComplete = 'tel',
  id,
}: PhoneFieldProps<W>) {
  useEffect(() => {
    const raw = form.getValues(name) as string | null | undefined;
    const value = raw == null ? '' : String(raw);
    if (value) {
      form.setValue(name, formatPhone(value) as PathValue<W, Path<W>>);
    }
  }, [form, name]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel className="text-inherit">{label}</FormLabel>
          <FormControl>
            <MaskedTelInput
              ref={field.ref}
              id={id}
              name={field.name}
              onBlur={field.onBlur}
              disabled={field.disabled}
              placeholder={placeholder}
              autoComplete={autoComplete}
              value={(field.value as string | null | undefined) ?? ''}
              onChange={field.onChange}
              className={cn(isHighlighted && 'ring-2 ring-primary ring-offset-0')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
