import { AppointmentSchemaType, HookFormType } from '@shared/schemas/appointment-schema';
import { DateFormField } from '../ui/form/date-form-field';

type StartDateFieldProps = HookFormType;

export const StartDateField = ({ form }: StartDateFieldProps) => {
  return <DateFormField<AppointmentSchemaType> form={form} label="Start" name="start" />;
};
