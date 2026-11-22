import {
  FormField,
  FormItem,
  InfoFormLabel,
  FormControl,
  FormMessage,
} from '../ui/form/form';
import { HookFormType } from '@shared/schemas/appointment-schema';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { useResourceContext } from '../resources/resource-context';
import { useMemo } from 'react';
import {
  Resource,
  isResourceWeeklyOffOnLocalDay,
  isSchedulableResource,
  sortResourcesByOrder,
} from '@shared/resource';
import { getClassName } from '@/components/resources/colors';
import { TechnicianColorSwatch } from '@/components/resources/technician-color-swatch';
import { cn } from '@/lib/utils';

type ScheduleResourceFieldProps = HookFormType;

export const ScheduleResourceField = ({ form }: ScheduleResourceFieldProps) => {
  const { resources } = useResourceContext();

  const formResourceId = form.watch('resourceId');
  const startRaw = form.watch('start');

  const selectedResource: Resource | undefined = useMemo(() => {
    return resources.find(resource => resource._id === formResourceId);
  }, [formResourceId, resources]);

  const appointmentDay: Date | null = useMemo(() => {
    if (startRaw == null || startRaw === '') {
      return null;
    }
    const d = startRaw instanceof Date ? startRaw : new Date(startRaw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startRaw]);

  const selectOptions = useMemo(() => {
    const schedulable = sortResourcesByOrder(resources.filter(r => isSchedulableResource(r)));
    const filtered =
      appointmentDay == null
        ? schedulable
        : schedulable.filter(
            r =>
              !isResourceWeeklyOffOnLocalDay(r, appointmentDay) || r._id === selectedResource?._id
          );
    if (selectedResource && !isSchedulableResource(selectedResource)) {
      return [selectedResource, ...filtered];
    }
    return filtered;
  }, [appointmentDay, resources, selectedResource]);

  const className = getClassName(selectedResource?.color);

  return (
    <FormField
      control={form.control}
      name="resourceId"
      render={({ field }) => (
        <FormItem className="w-full">
          <InfoFormLabel
            className="w-full"
            fieldName="Technician"
            info="Who will perform this service. Event colors on the schedule follow each technician. Add or edit people under Dashboard → Settings → Technicians."
          >
            Technician
          </InfoFormLabel>
          <FormControl>
            {/* <Input placeholder="Appointment Name" {...field} /> */}
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger
                className={cn(
                  'max-md:h-9 max-md:min-h-9 max-md:py-1 max-md:text-xs',
                  /* Colored border is the focus cue; skip ring so it doesn’t read as a second frame */
                  'focus-visible:ring-0',
                  selectedResource &&
                    cn('border-2 border-solid transition-[border-color] duration-150', className.border)
                )}
              >
                <div className="flex w-full items-center gap-2">
                  {selectedResource?.name ? (
                    <>
                      <TechnicianColorSwatch colorKey={selectedResource.color} />
                      <span>{selectedResource.name}</span>
                    </>
                  ) : (
                    <span>Select Technician</span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map(resource => {
                  const inactive = !isSchedulableResource(resource);
                  return (
                    <SelectItem
                      textValue={inactive ? `${resource.name} (inactive)` : resource.name}
                      key={resource._id}
                      value={resource._id ?? ''}
                    >
                      <div className="flex w-full items-center gap-2">
                        <TechnicianColorSwatch colorKey={resource.color} />
                        <span className="truncate">
                          {resource.name}
                          {inactive ? (
                            <span className="ml-1 text-muted-foreground">(inactive)</span>
                          ) : null}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
