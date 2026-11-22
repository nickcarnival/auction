import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../ui/form/form';
import { Textarea } from '@/components/ui/textarea';
import { HookFormType } from '@shared/schemas/appointment-schema';
import { useMemo } from 'react';

const noteMessages = [
  'Add any additional notes here',
  'Did you know you can have multiple lines\nOF NOTES?',
  'You can click and drag an appointment to create one of a specific duration.',
];

export const NotesField = ({ form }: HookFormType) => {
  const placeholder = useMemo(() => {
    return noteMessages[Math.floor(Math.random() * noteMessages.length)];
  }, []);

  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem className="w-full space-y-1.5 max-md:space-y-1">
          <FormLabel className="max-md:text-xs">Notes</FormLabel>
          <FormControl>
            <Textarea
              minLength={4}
              rows={6}
              placeholder={placeholder}
              className="min-h-[48px] resize-y md:text-sm max-md:min-h-[5.5rem] max-md:py-1.5 max-md:text-sm"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
