import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OperationsFormType } from './operations-constants';
import { DAYS_OF_WEEK, HOUR_OPTIONS } from './operations-constants';

const DAY_SUMMARY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function formatDayRanges(sortedDays: number[]): string {
  if (sortedDays.length === 0) return '';
  const runs: { start: number; end: number }[] = [];
  let start = sortedDays[0]!;
  let prev = sortedDays[0]!;
  for (let i = 1; i < sortedDays.length; i++) {
    const d = sortedDays[i]!;
    if (d === prev + 1) {
      prev = d;
    } else {
      runs.push({ start, end: prev });
      start = prev = d;
    }
  }
  runs.push({ start, end: prev });
  return runs
    .map(({ start: s, end: e }) =>
      s === e ? DAY_SUMMARY_ABBREV[s] : `${DAY_SUMMARY_ABBREV[s]}–${DAY_SUMMARY_ABBREV[e]}`
    )
    .join(', ');
}

type OperationsBusinessHoursCardProps = {
  form: UseFormReturn<OperationsFormType>;
  openHour: number | undefined;
};

export function OperationsBusinessHoursCard({ form, openHour }: OperationsBusinessHoursCardProps) {
  const currentShopHours = form.watch('shopHours');

  const sortedDays = currentShopHours.daysOpen?.length
    ? [...currentShopHours.daysOpen].sort((a, b) => a - b)
    : [];
  const openTime = HOUR_OPTIONS.find(h => h.value === currentShopHours.openHour)?.label;
  const closeTime = HOUR_OPTIONS.find(h => h.value === currentShopHours.closeHour)?.label;
  const summaryLine =
    sortedDays.length > 0 && openTime && closeTime
      ? `${formatDayRanges(sortedDays)} · ${openTime} – ${closeTime}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business hours</CardTitle>
        <CardDescription>Days you are open and regular daily window.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="shopHours.daysOpen"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Operating days</FormLabel>
              <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={field.value?.includes(day.value) ?? false}
                      onCheckedChange={checked => {
                        const current = field.value ?? [];
                        if (checked) {
                          field.onChange([...current, day.value].sort((a, b) => a - b));
                        } else {
                          field.onChange(current.filter(d => d !== day.value));
                        }
                      }}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="shopHours.openHour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening time</FormLabel>
                <Select
                  onValueChange={value => field.onChange(parseInt(value))}
                  value={field.value?.toString() ?? ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select opening time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOUR_OPTIONS.map(hour => (
                      <SelectItem key={hour.value} value={hour.value.toString()}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shopHours.closeHour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Closing time</FormLabel>
                <Select
                  onValueChange={value => field.onChange(parseInt(value))}
                  value={field.value?.toString() ?? ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select closing time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOUR_OPTIONS.filter(hour =>
                      openHour !== undefined ? hour.value > openHour : true
                    ).map(hour => (
                      <SelectItem key={hour.value} value={hour.value.toString()}>
                        {hour.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {summaryLine ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Summary:</span> {summaryLine}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
