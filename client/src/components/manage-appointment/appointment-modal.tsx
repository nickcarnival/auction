import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle } from '@/components/ui/drawer';
import { Form } from '@/components/ui/form/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppointmentContext } from '../schedule/appointment-context';
import moment from 'moment';
import { FORMAT } from '@shared/date-utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StartDateField } from './start-date-field';
import { appointmentSchema, AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import { ScheduleResourceField } from './schedule-resource-field';
import { NotesField } from './notes-field';
import { DurationField } from './duration-field';
import { CalendarDays, Crosshair, Trash, X } from 'lucide-react';
import { EndDateField } from './end-date-field';
import { CheckedInField } from './checked-in-field';
import { getEndDate, getStartHours } from '../schedule/duration';
import { useResourceContext } from '../resources/resource-context';
import { GenericField } from '../ui/form/generic-field';
import { MotorcycleField } from '../ui/form/motorcycle-field';
import { StatusField } from './status-field';
import { RemindButton } from './remind-button';
import { PhoneField } from '../ui/form/phone-field';
import { CustomerField } from './customer-field';
import { BookingConfirmationField } from './booking-confirmation-field';
import { useShopHours } from '@/contexts/tenant-context';
import { appointmentToReschedulePlacementDraft } from '@/utils/appointment-to-reschedule-draft';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useMinWidthMd } from '@/hooks/use-min-width-md';

function normalizeAppointmentCustomerId(raw: unknown): string | undefined {
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim();
  }
  if (
    raw &&
    typeof raw === 'object' &&
    '$oid' in raw &&
    typeof (raw as { $oid: unknown }).$oid === 'string'
  ) {
    const hex = (raw as { $oid: string }).$oid.trim();
    return hex || undefined;
  }
  return undefined;
}

export function AppointmentModal() {
  const {
    setCurrentAppointment,
    currentAppointment,
    addAppointment,
    remindAppointment,
    deleteAppointment,
    updateAppointment,
    focusAppointmentOnSchedule,
    setPlacementRequestDraft,
    setCurrentDate,
  } = useAppointmentContext();

  const navigate = useNavigate();
  const shopHours = useShopHours();
  const { resources } = useResourceContext();
  const isMdUp = useMinWidthMd();
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

  const editing = useMemo(() => {
    return !!currentAppointment?._id;
  }, [currentAppointment]);

  const creating = useMemo(() => {
    return currentAppointment != null;
  }, [currentAppointment]);

  const defaultValues = useMemo(() => {
    const duration = currentAppointment?.duration ?? 1.5;

    if (currentAppointment) {
      const fromSpread = currentAppointment as AppointmentSchemaType & { customerId?: unknown };
      return {
        ...currentAppointment,
        customerId: normalizeAppointmentCustomerId(fromSpread.customerId),
        end: currentAppointment.end ? new Date(currentAppointment.end) : undefined,
        duration,
      };
    }

    return {
      _id: '',
      customerId: undefined,
      start: new Date(),
      end: new Date(),
      duration,
      resourceId: '',
      notes: '',
      customer: '',
      phone: null,
      reminded: false,
      vehicle: '',
      service: '',
      checkedIn: false,
      status: '',
    } as AppointmentSchemaType;
  }, [currentAppointment]);

  const form = useForm<AppointmentSchemaType>({
    resolver: zodResolver(appointmentSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = useCallback(
    (values: AppointmentSchemaType) => {
      const initialHrs = getStartHours({
        start: values.start.toString(),
        initialStart: defaultValues.start,
        shopHours,
      });

      const start = moment(values.start).hour(initialHrs).format(FORMAT);

      const rid = values.resourceId?.trim() ?? '';
      const weeklyOff = resources.find(r => r._id === rid)?.weeklyOffDays;

      const end = getEndDate({
        start,
        duration: values.duration ?? 1.5,
        shopHours,
        technicianWeeklyOffDays: weeklyOff?.length ? weeklyOff : null,
      }).toUTCString();

      if (values._id) {
        updateAppointment({
          ...values,
          start,
          end,
        });
        setCurrentAppointment(null);
        return;
      }

      addAppointment({
        ...values,
        start,
        end,
      });

      setCurrentAppointment(null);
    },
    [
      addAppointment,
      defaultValues.start,
      resources,
      setCurrentAppointment,
      updateAppointment,
      shopHours,
    ]
  );

  const onClose = useCallback(
    (o: boolean) => {
      if (!o) setCurrentAppointment(null);
    },
    [setCurrentAppointment]
  );

  const handleDeleteForm = useCallback(() => {
    if (currentAppointment?._id) {
      deleteAppointment(currentAppointment);
      setCurrentAppointment(null);
    }
  }, [currentAppointment, deleteAppointment, setCurrentAppointment]);

  const handleFocusOnSchedule = useCallback(() => {
    const id = currentAppointment?._id;
    if (!id) {
      return;
    }
    focusAppointmentOnSchedule(id, currentAppointment.start);
  }, [currentAppointment, focusAppointmentOnSchedule]);

  const focusOnScheduleTooltip = 'Go to the shop calendar and look at this appointment.';

  const rescheduleOnCalendarTooltip =
    'Open the schedule to move this appointment to a different time slot.';

  const handleRescheduleOnCalendar = useCallback(() => {
    const values = form.getValues();
    const draft = appointmentToReschedulePlacementDraft(values);
    if (!draft) {
      toast.error('Could not start reschedule.');
      return;
    }
    const day = moment(values.start);
    if (!day.isValid()) {
      toast.error('Invalid start time.');
      return;
    }
    setPlacementRequestDraft(draft);
    setCurrentDate(day.clone().startOf('day').toDate());
    setCurrentAppointment(null);
    navigate('/dashboard/schedule');
  }, [form, navigate, setCurrentAppointment, setCurrentDate, setPlacementRequestDraft]);

  const handleRemindCustomer = useCallback(async () => {
    if (!currentAppointment?._id) return;
    const toEmail = currentAppointment.email?.trim() ?? '';
    try {
      await remindAppointment(currentAppointment);
      toast.success(toEmail ? `Reminder sent to ${toEmail}` : 'Reminder sent');
      setCurrentAppointment(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send reminder.');
    }
  }, [currentAppointment, remindAppointment, setCurrentAppointment]);

  const handleFieldHighlight = useCallback((fieldName: string) => {
    setHighlightedFields(prev => ({ ...prev, [fieldName]: true }));
    setTimeout(() => {
      setHighlightedFields(prev => ({ ...prev, [fieldName]: false }));
    }, 1000);
  }, []);

  const modalTitle = editing ? 'Edit appointment' : 'New appointment';

  return (
    <Drawer open={editing || creating} onOpenChange={onClose} dismissible={isMdUp}>
      <DrawerContent
        showDragHandle={isMdUp}
        className={cn(
          'flex flex-col overflow-hidden p-0',
          'h-[90vh] max-h-[90vh] md:h-[60vh] md:max-h-[60vh]',
          'max-md:mt-0 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none'
        )}
      >
        <DrawerTitle className="sr-only">{modalTitle}</DrawerTitle>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 w-full flex-1 flex-col"
          >
            <TooltipProvider delayDuration={400}>
              <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-2.5 md:hidden">
                <p className="min-w-0 text-sm font-semibold leading-tight text-foreground">
                  {modalTitle}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Close"
                  onClick={() => setCurrentAppointment(null)}
                >
                  <X className="size-5" aria-hidden />
                </Button>
              </div>

              <div
                data-appointment-drawer-form
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pt-2',
                  'max-md:px-1.5 max-md:pt-1',
                  'max-md:[&_.space-y-2]:space-y-1.5',
                  'max-md:[&_input]:h-9 max-md:[&_input]:min-h-9 max-md:[&_input]:py-1.5 max-md:[&_input]:text-sm',
                  'max-md:[&_textarea]:min-h-[5.5rem] max-md:[&_textarea]:py-1.5 max-md:[&_textarea]:text-sm',
                  'max-md:[&_label]:text-xs max-md:[&_label]:leading-snug'
                )}
              >
                <div className="flex w-full flex-col gap-0.5 pb-2 max-md:gap-0 md:flex-row md:gap-1">
                  {/* Left column - Appointment Details */}
                  <div className="flex-1 rounded-md border bg-muted px-2 max-md:px-1.5">
                    <div className="py-0.5 md:py-1">
                      {/* Customer Information Section */}
                      <div>
                        <div className="grid grid-cols-1 items-start gap-1.5 pt-0.5 md:grid-cols-3 md:gap-3 md:pt-1">
                          <CustomerField
                            form={form}
                            onFieldHighlight={handleFieldHighlight}
                            onNavigateToCustomerProfile={() => setCurrentAppointment(null)}
                          />
                          <PhoneField
                            label="Phone"
                            form={form}
                            name="phone"
                            placeholder="1234567890"
                            isHighlighted={highlightedFields.phone}
                          />
                          <GenericField
                            label="Email"
                            form={form}
                            name="email"
                            type="email"
                            placeholder="customer@email.com"
                            isHighlighted={highlightedFields.email}
                          />
                        </div>
                      </div>

                      {/* Appointment Timing Section */}
                      <div>
                        <div className="grid grid-cols-1 items-start gap-1.5 md:grid-cols-3 md:gap-3">
                          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2 md:gap-2">
                            <div className="min-w-0 flex-1">
                              <StartDateField form={form} />
                            </div>
                            {currentAppointment?._id ? (
                              <TooltipButton
                                type="button"
                                tooltip={rescheduleOnCalendarTooltip}
                                variant="outline"
                                tooltipDisabledWrapper={false}
                                size="sm"
                                className="h-9 shrink-0 gap-1 px-3 sm:h-10 sm:self-end"
                                onClick={handleRescheduleOnCalendar}
                              >
                                <CalendarDays className="h-4 w-4 shrink-0" />
                                Reschedule
                              </TooltipButton>
                            ) : null}
                          </div>
                          <div className="min-w-0 w-full justify-self-start md:max-w-56">
                            <EndDateField form={form} />
                          </div>
                          <DurationField form={form} />
                        </div>
                      </div>

                      {/* Service Details Section */}
                      <div>
                        <div className="grid grid-cols-1 items-start gap-1.5 md:grid-cols-2 md:gap-3">
                          <GenericField
                            name="service"
                            placeholder="Oil Change"
                            label="Service"
                            form={form}
                          />
                          <MotorcycleField form={form} />
                        </div>
                      </div>

                      {/* Notes Section */}
                      <NotesField form={form} />
                    </div>
                  </div>

                  {/* Right column - Management Details */}
                  <div className="w-full rounded-md border bg-muted px-2 pt-0.5 max-md:px-1.5 md:w-80 md:pt-1">
                    <div>
                      <ScheduleResourceField form={form} />

                      <div className="space-y-2 md:space-y-3">
                        <StatusField form={form} />
                        <CheckedInField form={form} />
                        <BookingConfirmationField form={form} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Errors */}
                {Object.entries(form.formState.errors).length > 0 && (
                  <div className="bg-destructive/10 p-3 rounded-md border border-destructive/30">
                    <h4 className="text-sm font-medium text-destructive mb-2">
                      Please fix the following errors:
                    </h4>
                    <ul className="list-disc list-inside">
                      {Object.entries(form.formState.errors).map(([key, value]) => (
                        <li key={key} className="text-destructive text-sm">
                          {key}: {value.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DrawerFooter className="mt-auto shrink-0 gap-2 border-t bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 max-md:px-3 md:pt-2">
                {/* Mobile: Close | Save, then trash | Remind | Focus — pinned to bottom */}
                <div className="flex w-full min-w-0 flex-col gap-2 md:hidden">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 min-h-10 flex-1"
                      onClick={() => setCurrentAppointment(null)}
                    >
                      Close
                    </Button>
                    <Button type="submit" variant="solid" className="h-10 min-h-10 flex-1">
                      Save
                    </Button>
                  </div>
                  {currentAppointment?._id ? (
                    <div className="flex items-stretch gap-2 border-t border-border/70 pt-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        aria-label="Delete appointment"
                        onClick={handleDeleteForm}
                      >
                        <Trash className="size-4" aria-hidden />
                      </Button>
                      <RemindButton onRemind={handleRemindCustomer} className="min-w-0 flex-1" />
                      <TooltipButton
                        type="button"
                        tooltip={focusOnScheduleTooltip}
                        variant="outline"
                        tooltipDisabledWrapper={false}
                        size="sm"
                        className="h-9 min-w-0 flex-1 gap-1 px-2 text-xs"
                        onClick={handleFocusOnSchedule}
                      >
                        <Crosshair className="size-3.5 shrink-0" aria-hidden />
                        Focus
                      </TooltipButton>
                    </div>
                  ) : null}
                </div>

                {/* Tablet/desktop footer */}
                <div className="hidden w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center md:flex">
                  <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    {currentAppointment?._id && (
                      <Button
                        variant="destructive"
                        onClick={handleDeleteForm}
                        type="button"
                        className="gap-1 w-full sm:w-auto"
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setCurrentAppointment(null)}
                      type="button"
                      className="gap-1 w-full sm:w-auto"
                    >
                      <X className="h-4 w-4" />
                      Close
                    </Button>
                    {currentAppointment?._id && (
                      <TooltipButton
                        type="button"
                        tooltip={focusOnScheduleTooltip}
                        variant="outline"
                        tooltipDisabledWrapper={false}
                        onClick={handleFocusOnSchedule}
                        className="gap-1 w-full sm:w-auto"
                      >
                        <Crosshair className="h-4 w-4" />
                        Focus
                      </TooltipButton>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">
                    <RemindButton
                      onRemind={handleRemindCustomer}
                      className="w-full min-w-0 sm:w-auto"
                    />
                    <Button type="submit" variant="solid" className="w-full min-w-0 sm:w-auto">
                      Save
                    </Button>
                  </div>
                </div>
              </DrawerFooter>
            </TooltipProvider>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
