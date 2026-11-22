import { format, startOfDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import { useShopHours } from '@/contexts/tenant-context';
import { BookingPopoverPortalContainerContext } from '@/pages/subdomain/booking-popover-portal-context';
import type { DayModifiers, Matcher } from 'react-day-picker';

type DateFieldProps = {
  initialDate?: Date | string;
  onDateChange: (date: Date) => void;
  defaultOpen?: boolean;
  hideWeekends?: boolean;
  /**
   * When there is no `initialDate`, show "Pick a date" instead of defaulting to today
   * (e.g. optional follow-up reminder on a booking request).
   */
  allowEmpty?: boolean;
  /** When true, days before today (local) cannot be selected. */
  disablePastDates?: boolean;
};

function timeKeyFromInitial(initialDate: Date | string | undefined): number | null {
  if (initialDate == null || initialDate === '') {
    return null;
  }
  const d = initialDate instanceof Date ? initialDate : new Date(initialDate);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

// TODO: custom business days this file needs updates too
export function GenericDateField({
  initialDate,
  onDateChange,
  hideWeekends = true,
  defaultOpen = false,
  allowEmpty = false,
  disablePastDates = false,
}: DateFieldProps) {
  const [date, setDate] = useState<Date | null>(() => {
    const k = timeKeyFromInitial(initialDate);
    if (k != null) {
      return new Date(k);
    }
    return allowEmpty ? null : new Date();
  });
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
  const shopHours = useShopHours();
  const bookingPopoverContainer = useContext(BookingPopoverPortalContainerContext);

  const syncKey = timeKeyFromInitial(initialDate);
  useEffect(() => {
    if (allowEmpty) {
      if (syncKey == null) {
        setDate(null);
      } else {
        setDate(new Date(syncKey));
      }
    } else if (syncKey != null) {
      setDate(new Date(syncKey));
    }
  }, [syncKey, allowEmpty]);

  // Calculate which days to disable based on tenant shop hours and optional past-date cutoff
  const modifiers = useMemo((): DayModifiers => {
    const disabledMatchers: Matcher[] = [];

    if (hideWeekends) {
      const calendarOpenDays = shopHours.daysOpen;
      const allCalendarDays = [0, 1, 2, 3, 4, 5, 6];
      const disabledDays = allCalendarDays.filter(day => !calendarOpenDays.includes(day));
      if (disabledDays.length > 0) {
        disabledMatchers.push({ dayOfWeek: disabledDays });
      }
    }

    if (disablePastDates) {
      disabledMatchers.push({ before: startOfDay(new Date()) });
    }

    if (disabledMatchers.length === 0) {
      return {};
    }
    return { disabled: disabledMatchers };
  }, [hideWeekends, shopHours.daysOpen, disablePastDates]);

  const handleDateChange = useCallback(
    (d: Date) => {
      if (Number.isNaN(d.getTime())) {
        return;
      }
      setDate(d);
      onDateChange(d);
      setIsOpen(false);
    },
    [onDateChange]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'flex w-full items-center justify-start text-left font-normal text-foreground max-md:h-9 max-md:min-h-9 max-md:py-1 max-md:text-sm',
            !date && 'text-muted-foreground'
          )}
        >
          {date ? format(date, 'PPP') : <span className="text-muted-foreground">Pick a date</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" container={bookingPopoverContainer}>
        <Calendar
          mode="single"
          modifiers={modifiers}
          selected={date ?? undefined}
          initialFocus
          required={!allowEmpty}
          onSelect={d => {
            if (d) {
              handleDateChange(d);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
