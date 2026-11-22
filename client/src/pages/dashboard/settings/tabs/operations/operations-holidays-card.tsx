import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { HolidayListItem } from '@shared/holidays/holiday';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form/form';
import type { OperationsFormType } from './operations-constants';

/** Local calendar date from stored `YYYY-MM-DD` (settings use date-only, not UTC instants). */
function parseClosedDateYmd(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function ClosedDatePickerField({
  value,
  onChange,
  triggerId,
}: {
  value: string;
  onChange: (ymd: string) => void;
  triggerId: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseClosedDateYmd(value), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selected && 'text-muted-foreground'
          )}
          id={triggerId}
        >
          {selected ? format(selected, 'PPP') : <span>Pick a date</span>}
          <CalendarIcon className="ml-auto size-4 shrink-0 opacity-70" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? new Date()}
          initialFocus
          onSelect={d => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function toggleCodeInSelection(
  codes: string[],
  code: string,
  nextChecked: boolean,
  orderedCodes: string[]
): string[] {
  const set = new Set(codes);
  if (nextChecked) {
    set.add(code);
  } else {
    set.delete(code);
  }
  return orderedCodes.filter(c => set.has(c));
}

type OperationsHolidaysCardProps = {
  form: UseFormReturn<OperationsFormType>;
  holidays: HolidayListItem[];
};

function HolidayGrid({
  entries,
  fieldValue,
  orderedCodes,
  onToggle,
}: {
  entries: HolidayListItem[];
  fieldValue: string[];
  orderedCodes: string[];
  onToggle: (next: string[]) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {entries.map(entry => {
        const checked = fieldValue.includes(entry.code);
        const flip = () => {
          onToggle(toggleCodeInSelection(fieldValue, entry.code, !checked, orderedCodes));
        };
        return (
          <li key={entry.code}>
            <div
              role="checkbox"
              aria-checked={checked}
              tabIndex={0}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-left shadow-sm outline-none ring-offset-background transition-[background-color,box-shadow] duration-150 hover:bg-muted hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={flip}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  flip();
                }
              }}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary',
                  checked && 'bg-primary text-primary-foreground'
                )}
              >
                {checked ? <Check className="size-3 stroke-[3]" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-snug">{entry.label}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.typicalTiming}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function OperationsHolidaysCard({ form, holidays }: OperationsHolidaysCardProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'shopClosedDates',
  });

  const { defaultHolidays, otherHolidays, orderedCodes } = useMemo(() => {
    const orderedCodesInner = holidays.map(h => h.code);
    const defaultHolidaysInner = holidays.filter(h => h.isDefault);
    const otherHolidaysInner = holidays.filter(h => !h.isDefault);
    return {
      defaultHolidays: defaultHolidaysInner,
      otherHolidays: otherHolidaysInner,
      orderedCodes: orderedCodesInner,
    };
  }, [holidays]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop closed days</CardTitle>
        <CardDescription className="space-y-2">
          <p>
            Closed days are highlighted on the schedule (month, work week, day) as a reminder—they
            do <span className="font-medium text-foreground">not</span> block booking or change how
            appointment length is calculated (that still follows weekly business hours). Changes here
            save automatically after you pause editing.
          </p>
          <ul className="list-inside list-disc space-y-0.5">
            <li>
              <span className="font-medium text-foreground">Federal catalog</span> — pick which US
              federal dates you observe (same read-only list as before).
            </li>
            <li>
              <span className="font-medium text-foreground">Extra dates</span> — training, vacation
              week, dealer event, local holiday, etc.
            </li>
          </ul>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormField
          control={form.control}
          name="observedHolidayIds"
          render={({ field }) => (
            <FormItem>
              <div className="space-y-8">
                <section className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Suggested defaults</h3>
                      <p className="text-xs text-muted-foreground">
                        Pre-selected for new signups; adjust to match how you operate. Click anywhere
                        on a row to toggle.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 self-start"
                      disabled={defaultHolidays.length === 0}
                      onClick={() => {
                        const set = new Set(field.value);
                        for (const h of defaultHolidays) {
                          set.add(h.code);
                        }
                        field.onChange(orderedCodes.filter(c => set.has(c)));
                      }}
                    >
                      Select all defaults
                    </Button>
                  </div>
                  <HolidayGrid
                    entries={defaultHolidays}
                    fieldValue={field.value}
                    orderedCodes={orderedCodes}
                    onToggle={field.onChange}
                  />
                </section>

                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Other federal holidays</h3>
                    <p className="text-xs text-muted-foreground">
                      Add if your business observes these. Click anywhere on a row to toggle.
                    </p>
                  </div>
                  <HolidayGrid
                    entries={otherHolidays}
                    fieldValue={field.value}
                    orderedCodes={orderedCodes}
                    onToggle={field.onChange}
                  />
                </section>

                <section className="space-y-3 border-t border-border pt-6">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Extra closed dates</h3>
                    <p className="text-xs text-muted-foreground">
                      Optional label shows in the schedule header tooltip (defaults to “Shop closed”).
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {fields.map((row, index) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
                      >
                        <FormField
                          control={form.control}
                          name={`shopClosedDates.${index}.date`}
                          render={({ field }) => (
                            <FormItem className="min-w-[12rem] flex-1">
                              <FormLabel className="text-xs" htmlFor={`shop-closed-date-${row.id}`}>
                                Date
                              </FormLabel>
                              <ClosedDatePickerField
                                triggerId={`shop-closed-date-${row.id}`}
                                value={field.value ?? ''}
                                onChange={field.onChange}
                              />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`shopClosedDates.${index}.note`}
                          render={({ field }) => (
                            <FormItem className="min-w-0 flex-[2]">
                              <FormLabel className="text-xs">Label (optional)</FormLabel>
                              <Input
                                placeholder="e.g. Company retreat"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                          aria-label={`Remove closed date row ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border bg-muted/40 shadow-sm transition-[background-color,box-shadow] duration-150 hover:bg-muted hover:shadow-md"
                    onClick={() => append({ date: '', note: '' })}
                  >
                    Add closed date
                  </Button>
                </section>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
