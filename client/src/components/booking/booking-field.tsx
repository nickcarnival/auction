import { Input } from '@/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form/form';
import { BookingSchemaType, HookFormType } from '@shared/schemas/booking-schema';
import { Textarea } from '../ui/textarea';
import { ReactNode } from 'react';

type BookingFieldProps = {
  name: keyof Omit<BookingSchemaType, 'start' | 'end'>;
  label: ReactNode;
  placeholder: string;
  type?: 'input' | 'textarea';
  autoComplete?: string;
  /** Hints LastPass / 1Password to skip this control (free-text fields that aren’t login or address). */
  dataLpIgnore?: boolean;
} & HookFormType;

/**
 * Non Date Fields
 **/
export const BookingField = ({
  form,
  label,
  name,
  placeholder,
  type = 'input',
  autoComplete,
  dataLpIgnore = false,
}: BookingFieldProps) => {
  const Field = type === 'input' ? Input : Textarea;

  const extensionHints =
    dataLpIgnore && type === 'input'
      ? ({
          'data-lpignore': 'true',
          'data-1p-ignore': true,
        } as const)
      : {};

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel className="text-inherit">{label}</FormLabel>
          <FormControl>
            <Field
              placeholder={placeholder}
              {...field}
              autoComplete={autoComplete}
              {...extensionHints}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
