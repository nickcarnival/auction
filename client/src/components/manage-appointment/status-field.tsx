import { FormField, FormItem, InfoFormLabel, FormControl, FormMessage } from '../ui/form/form';
import { HookFormType } from '@shared/schemas/appointment-schema';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appointmentFieldIcons } from './appointment-display-icons';

type StatusFieldProps = HookFormType;

const options = ['Dyno', 'Vacation', 'Waiter', 'None'] as const;

type StatusOption = (typeof options)[number];

const STATUS_SELECT_ICONS: Record<StatusOption, { Icon: LucideIcon; className: string }> = {
  Dyno: { Icon: appointmentFieldIcons.dyno, className: 'text-action' },
  Vacation: { Icon: appointmentFieldIcons.vacation, className: 'text-status-vacation' },
  Waiter: { Icon: appointmentFieldIcons.waiter, className: 'text-primary-deep' },
  None: { Icon: CalendarDays, className: 'text-muted-foreground' },
};

function StatusSelectIcon({ option }: { option: string }) {
  const key = (option === '' || option == null ? 'None' : option) as StatusOption;
  const config = STATUS_SELECT_ICONS[key] ?? STATUS_SELECT_ICONS.None;
  const { Icon, className } = config;
  return <Icon className={cn('size-4 shrink-0', className)} aria-hidden />;
}

export const StatusField = ({ form }: StatusFieldProps) => {
  const formStatus = form.watch('status');
  const selectValue = formStatus === '' || formStatus == null ? 'None' : formStatus;

  return (
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem className="w-full">
          <InfoFormLabel
            fieldName="Status"
            info="Status on the calendar: Dyno reserves the dyno/special bay, Vacation marks time off (not bookable service), Waiter shows a banner stripe, None is a normal service appointment."
          >
            Status
          </InfoFormLabel>
          <FormControl>
            <Select
              onValueChange={v => field.onChange(v === 'None' ? '' : v)}
              value={field.value === '' || field.value == null ? 'None' : field.value}
            >
              <SelectTrigger className="max-md:h-9 max-md:min-h-9 max-md:py-1 max-md:text-xs">
                <div className="flex w-full items-center gap-2">
                  <StatusSelectIcon option={selectValue} />
                  <span className="min-w-0 truncate">{selectValue}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map(option => (
                  <SelectItem textValue={option} key={option} value={option}>
                    <div className="flex w-full items-center gap-2">
                      <StatusSelectIcon option={option} />
                      <span>{option}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
