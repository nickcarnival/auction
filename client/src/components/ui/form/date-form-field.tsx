import { ReactNode } from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  InfoFormLabel,
  FormControl,
  FormMessage,
} from './form';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { GenericDateField } from '../../booking/generic-date-field';

type BookingFieldProps<F extends FieldValues> = {
  form: UseFormReturn<F>;
  name: FieldPath<F>;
  label: ReactNode;
  dark?: boolean;
  /** Adds the info (ⓘ) tooltip next to the label, same pattern as `InfoFormLabel`. */
  labelInfo?: { info: string; fieldName: string };
};

export const DateFormField = <T extends FieldValues>({
  form,
  label,
  name,
  dark,
  labelInfo,
}: BookingFieldProps<T>) => {
  const labelClass = dark ? 'text-inherit' : 'text-foreground';

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          {labelInfo ? (
            <InfoFormLabel className={labelClass} info={labelInfo.info} fieldName={labelInfo.fieldName}>
              {label}
            </InfoFormLabel>
          ) : (
            <FormLabel className={labelClass}>{label}</FormLabel>
          )}
          <FormControl>
            <GenericDateField initialDate={field.value} onDateChange={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
