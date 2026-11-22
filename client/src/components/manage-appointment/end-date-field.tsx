import { AppointmentSchemaType, HookFormType } from '@shared/schemas/appointment-schema';
import { DateFormField } from '../ui/form/date-form-field';

type EndDateFieldProps = HookFormType;

export const EndDateField = ({ form }: EndDateFieldProps) => {
  return (
    <DateFormField<AppointmentSchemaType>
      form={form}
      label="Promised Date"
      name="end"
      labelInfo={{
        fieldName: 'Promised Date',
        info: 'The day you commit to having the bike ready for customer pickup—the same field as “preferred pickup” on an incoming booking request once it is booked on the calendar.',
      }}
    />
  );
};
