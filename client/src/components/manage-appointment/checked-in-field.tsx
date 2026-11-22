import {
  FormField,
  FormItem,
  InfoFormLabel,
  FormControl,
  FormMessage,
} from '../ui/form/form';
import { YesNoSegment } from '@/components/ui/yes-no-segment';
import { HookFormType } from '@shared/schemas/appointment-schema';
import { appointmentFieldIcons } from './appointment-display-icons';

type CheckedInFieldProps = HookFormType;

export const CheckedInField = ({ form }: CheckedInFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="checkedIn"
      render={({ field: { onChange, value } }) => (
        <FormItem className="flex w-full flex-col gap-2 space-y-0">
          <InfoFormLabel
            className="w-full"
            fieldName="Checked in"
            info="Use when the customer's bike is physically at the shop (checked in). This drives calendar labels and status so your team can see who still needs a drop-off."
          >
            Checked In
          </InfoFormLabel>
          <FormControl>
            <YesNoSegment
              value={Boolean(value)}
              onChange={onChange}
              aria-label="Checked in"
              icons={{ yes: appointmentFieldIcons.checkedInYes, no: appointmentFieldIcons.checkedInNo }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
