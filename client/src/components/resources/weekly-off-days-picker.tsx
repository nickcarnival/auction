import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useShopHours } from '@/contexts/tenant-context';
import { getTenantOperatingWeekdays } from '@/utils/work-week-range';
import { useEffect, useMemo, useRef } from 'react';

const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;
const WEEKDAY_SHORT: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export type WeeklyOffDaysPickerProps = {
  /** Optional suffix for stable id (e.g. technician id). */
  idSuffix?: string;
  legendClassName?: string;
  value: number[];
  onChange: (days: number[]) => void;
  disabled?: boolean;
};

/**
 * Multi-select weekdays (0 = Sun … 6 = Sat, `Date#getDay()`). Selected = recurring weekly day off.
 * Days the shop is closed are disabled so they cannot be chosen as “off” (they never appear as schedule columns).
 */
export function WeeklyOffDaysPicker({
  idSuffix = 'default',
  legendClassName,
  value,
  onChange,
  disabled = false,
}: WeeklyOffDaysPickerProps) {
  const { daysOpen } = useShopHours();
  const operatingWeekdays = useMemo(() => getTenantOperatingWeekdays(daysOpen), [daysOpen]);
  const operatingSet = useMemo(() => new Set(operatingWeekdays), [operatingWeekdays]);
  const operatingKey = operatingWeekdays.join(',');
  const valueKey = useMemo(() => [...value].sort((a, b) => a - b).join(','), [value]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  /** Drop days that are not tenant operating days (e.g. after shop hours change or legacy data). */
  useEffect(() => {
    const allowList =
      operatingKey === ''
        ? getTenantOperatingWeekdays([])
        : operatingKey.split(',').map(n => Number.parseInt(n, 10));
    const allow = new Set(allowList);
    const current = valueKey === '' ? [] : valueKey.split(',').map(n => Number.parseInt(n, 10));
    const cleaned = current.filter(d => allow.has(d));
    if (cleaned.length !== current.length) {
      onChangeRef.current(cleaned);
    }
  }, [operatingKey, valueKey]);

  const selected = useMemo(() => new Set(value), [value]);
  const hintId = `weekly-off-hint-${idSuffix}`;

  const toggle = (d: number) => {
    if (disabled || !operatingSet.has(d)) {
      return;
    }
    const next = new Set(selected);
    if (next.has(d)) {
      next.delete(d);
    } else {
      next.add(d);
    }
    const sorted = [...next].sort((a, b) => a - b).filter(x => operatingSet.has(x));
    onChange(sorted);
  };

  return (
    <fieldset className="space-y-1.5 border-0 p-0">
      <legend className={cn('text-xs font-medium text-muted-foreground', legendClassName)}>
        Weekly days off
      </legend>
      <p id={hintId} className="text-xs text-muted-foreground">
        Choose workdays this person is always off. They won’t appear on the team calendar those days.
        Grayed-out days are when your shop is closed (from your hours in settings), so there’s nothing
        to set here. Existing appointments are not removed; change them on the calendar if needed.
      </p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Weekly recurring days off"
        aria-describedby={hintId}
      >
        {WEEKDAY_ORDER.map(d => {
          const shopOpenThisWeekday = operatingSet.has(d);
          const isOff = selected.has(d) && shopOpenThisWeekday;
          const dayDisabled = disabled || !shopOpenThisWeekday;

          const closedDayTooltip =
            "Your shop isn’t open this day (check business hours in Settings). It isn’t a workday on the calendar, so you don’t need to mark it off.";

          const button = (
            <Button
              type="button"
              variant={isOff ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'min-w-[2.75rem] px-2 font-medium',
                isOff && 'shadow-sm',
                !shopOpenThisWeekday && 'opacity-40'
              )}
              disabled={dayDisabled}
              aria-pressed={isOff}
              onClick={() => toggle(d)}
            >
              {WEEKDAY_SHORT[d]}
            </Button>
          );

          if (!shopOpenThisWeekday) {
            return (
              <Tooltip key={d}>
                <TooltipTrigger asChild>
                  <span className="inline-flex">{button}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-left">
                  {closedDayTooltip}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <span key={d} className="inline-flex">
              {button}
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}
