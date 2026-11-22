import {
  FormField,
  FormItem,
  InfoFormLabel,
  FormControl,
  FormMessage,
} from '../ui/form/form';
import { Input } from '@/components/ui/input';
import { HookFormType } from '@shared/schemas/appointment-schema';

type DurationFieldProps = HookFormType;

export const DurationField = ({ form }: DurationFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="duration"
      render={({ field }) => (
        <FormItem className="w-full">
          <InfoFormLabel
            fieldName="Duration"
            info="Length of the job in hours (steps of 0.5 = 30 minutes). The calendar uses this with shop hours to compute the promised end date from the start time."
          >
            Duration (hours)
          </InfoFormLabel>
          <FormControl>
            <Input
              step={0.5}
              type="number"
              placeholder="0.5"
              {...field}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore={true}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
