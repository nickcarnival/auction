import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle } from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TechnicianColorSwatch } from '@/components/resources/technician-color-swatch';
import { cn } from '@/lib/utils';
import type { ShopHours } from '@shared/tenant';
import {
  recurringScheduleBlockFormSchema,
  type RecurringScheduleBlock,
} from '@shared/recurring-schedule-block';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DAYS_OF_WEEK, HOUR_OPTIONS } from './operations-constants';
import type { Resource } from '@shared/resource';
import { isSchedulableResource, sortResourcesByOrder } from '@shared/resource';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, X } from 'lucide-react';
import { useMinWidthMd } from '@/hooks/use-min-width-md';

function roundToHalfHour(h: number): number {
  return Math.round(h * 2) / 2;
}

function formatStopTimeLabel(endHour: number): string {
  const h = Math.floor(endHour);
  const m = endHour - h >= 0.49 ? 30 : 0;
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: m ? '2-digit' : undefined,
    hour12: true,
  });
}

function buildStopSlotOptions(
  startHour: number,
  closeHour: number
): { end: number; label: string }[] {
  const out: { end: number; label: string }[] = [];
  for (let halfSteps = 1; ; halfSteps += 1) {
    const end = roundToHalfHour(startHour + halfSteps * 0.5);
    if (end > closeHour + 1e-9) break;
    out.push({ end, label: formatStopTimeLabel(end) });
  }
  return out;
}

function buildFormSchema(shop: ShopHours) {
  return recurringScheduleBlockFormSchema.superRefine((val, ctx) => {
    if (val.startHour < shop.openHour || val.startHour >= shop.closeHour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start time must fall within business hours.',
        path: ['startHour'],
      });
    }
    const maxDur = shop.closeHour - val.startHour;
    if (val.durationHours > maxDur + 1e-9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At most ${maxDur} hours until close for this start time.`,
        path: ['durationHours'],
      });
    }
    if (
      val.interval === 'weekly' &&
      val.dayOfWeek !== undefined &&
      !shop.daysOpen.includes(val.dayOfWeek)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Choose a day your shop is open.',
        path: ['dayOfWeek'],
      });
    }
  });
}

export type RecurringBlockFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

type RecurringBlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopHours: ShopHours;
  techniciansResources: Resource[];
  editing: RecurringScheduleBlock | null;
  onSave: (block: RecurringScheduleBlock) => void;
  /** When set, footer shows Delete while editing an existing block. */
  onDelete?: (block: RecurringScheduleBlock) => void;
};

function defaultFormValues(shop: ShopHours): RecurringBlockFormValues {
  const firstDay = shop.daysOpen[0] ?? 1;
  const startH = shop.openHour;
  const maxDur = Math.max(0.5, shop.closeHour - startH);
  return {
    title: '',
    note: '',
    interval: 'weekly',
    dayOfWeek: firstDay,
    dayOfMonth: 1,
    startHour: startH,
    durationHours: Math.min(1, maxDur),
    resourceIds: [],
  };
}

export function RecurringBlockDialog({
  open,
  onOpenChange,
  shopHours,
  techniciansResources,
  editing,
  onSave,
  onDelete,
}: RecurringBlockDialogProps) {
  const isMdUp = useMinWidthMd();
  const formSchema = useMemo(() => buildFormSchema(shopHours), [shopHours]);

  const form = useForm<RecurringBlockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues(shopHours),
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        id: editing.id,
        title: editing.title,
        note: editing.note ?? '',
        interval: editing.interval,
        dayOfWeek: editing.interval === 'weekly' ? editing.dayOfWeek : undefined,
        dayOfMonth: editing.interval === 'monthly' ? editing.dayOfMonth : undefined,
        startHour: editing.startHour,
        durationHours: editing.durationHours,
        resourceIds: editing.resourceIds,
      });
    } else {
      form.reset(defaultFormValues(shopHours));
    }
  }, [open, editing, shopHours, form]);

  const startHour = form.watch('startHour');
  const interval = form.watch('interval');

  useEffect(() => {
    if (!open) return;
    const sh = startHour ?? shopHours.openHour;
    const maxDur = Math.max(0.5, shopHours.closeHour - sh);
    const dur = form.getValues('durationHours');
    if (typeof dur === 'number' && dur > maxDur + 1e-9) {
      form.setValue('durationHours', maxDur, { shouldValidate: true });
    }
  }, [open, startHour, shopHours.closeHour, shopHours.openHour, form]);

  /** Keep duration aligned to a valid half-hour stop time (e.g. after load or start change). */
  useEffect(() => {
    if (!open) return;
    const sh = startHour ?? shopHours.openHour;
    const slots = buildStopSlotOptions(sh, shopHours.closeHour);
    if (slots.length === 0) return;
    const dur = form.getValues('durationHours');
    const end = roundToHalfHour(sh + (typeof dur === 'number' ? dur : 0.5));
    const matchesSlot = slots.some(s => Math.abs(s.end - end) < 0.01);
    if (!matchesSlot) {
      let closest = slots[0]!;
      for (let i = 1; i < slots.length; i++) {
        const o = slots[i]!;
        if (Math.abs(o.end - end) < Math.abs(closest.end - end)) closest = o;
      }
      form.setValue('durationHours', roundToHalfHour(closest.end - sh), { shouldValidate: true });
    }
  }, [open, startHour, shopHours.closeHour, form, shopHours.openHour]);

  const stopSlotOptions = useMemo(
    () => buildStopSlotOptions(startHour ?? shopHours.openHour, shopHours.closeHour),
    [startHour, shopHours.openHour, shopHours.closeHour]
  );

  const operatingDayOptions = useMemo(
    () => DAYS_OF_WEEK.filter(d => shopHours.daysOpen.includes(d.value)),
    [shopHours.daysOpen]
  );

  const schedulable = useMemo(
    () => sortResourcesByOrder(techniciansResources.filter(r => isSchedulableResource(r))),
    [techniciansResources]
  );

  const schedulableIds = useMemo(() => {
    const ids: string[] = [];
    for (const r of schedulable) {
      const id = r._id;
      if (id) ids.push(id);
    }
    return ids;
  }, [schedulable]);

  const fullBusinessDayDurationHours = useMemo(
    () => roundToHalfHour(shopHours.closeHour - shopHours.openHour),
    [shopHours.closeHour, shopHours.openHour]
  );

  const durationHoursValue = form.watch('durationHours');
  const isFullBusinessDaySelected =
    (startHour ?? shopHours.openHour) === shopHours.openHour &&
    typeof durationHoursValue === 'number' &&
    Math.abs(durationHoursValue - fullBusinessDayDurationHours) < 1e-6;

  const applyFullBusinessDay = () => {
    if (shopHours.closeHour <= shopHours.openHour) return;
    form.setValue('startHour', shopHours.openHour, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue('durationHours', fullBusinessDayDurationHours, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleDeleteFromDrawer = () => {
    if (!editing || !onDelete) return;
    onDelete(editing);
    onOpenChange(false);
  };

  const submit = form.handleSubmit(values => {
    const id = editing?.id ?? crypto.randomUUID();
    const noteTrimmed = values.note?.trim();
    const block: RecurringScheduleBlock = {
      id,
      title: values.title.trim(),
      interval: values.interval,
      startHour: values.startHour,
      durationHours: values.durationHours,
      resourceIds: values.resourceIds,
      ...(values.interval === 'weekly'
        ? { dayOfWeek: values.dayOfWeek, dayOfMonth: undefined }
        : { dayOfMonth: values.dayOfMonth, dayOfWeek: undefined }),
      ...(noteTrimmed ? { note: noteTrimmed } : {}),
    };
    onSave(block);
    onOpenChange(false);
  });

  const modalTitle = editing ? 'Edit recurring block' : 'Add recurring block';

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={isMdUp} handleOnly>
      <DrawerContent
        showDragHandle={false}
        className={cn(
          'flex flex-col overflow-hidden p-0',
          // Vaul sets touch-action:none on [data-vaul-drawer], which breaks text selection; restore browser defaults.
          '!touch-auto',
          'h-[78vh] max-h-[78vh] md:h-[min(58vh,34rem)] md:max-h-[min(58vh,34rem)]',
          'max-md:mt-0 max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none'
        )}
      >
        <DrawerTitle className="sr-only">{modalTitle}</DrawerTitle>
        <Form {...form}>
          <form onSubmit={submit} className="flex min-h-0 w-full flex-1 flex-col">
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
                onClick={() => onOpenChange(false)}
              >
                <X className="size-5" aria-hidden />
              </Button>
            </div>

            <div
              className={cn(
                'select-text min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pt-2',
                'max-md:px-1.5 max-md:pt-1',
                'max-md:[&_input]:h-9 max-md:[&_input]:min-h-9 max-md:[&_input]:py-1.5 max-md:[&_input]:text-sm',
                'max-md:[&_label]:text-xs max-md:[&_label]:leading-snug'
              )}
            >
              <div className="space-y-4 rounded-md border bg-muted px-2 py-2 max-md:px-1.5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What is it?</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Team meeting, shop cleanup, …"
                          {...field}
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-x-2 sm:gap-y-3">
                  <FormField
                    control={form.control}
                    name="interval"
                    render={({ field }) => (
                      <FormItem className="min-w-0 space-y-1.5">
                        <FormLabel>Repeats</FormLabel>
                        <Select
                          onValueChange={v =>
                            field.onChange(v as RecurringScheduleBlock['interval'])
                          }
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {interval === 'weekly' ? (
                    <FormField
                      control={form.control}
                      name="dayOfWeek"
                      render={({ field }) => (
                        <FormItem className="min-w-0 space-y-1.5">
                          <FormLabel>Day</FormLabel>
                          <Select
                            onValueChange={v => field.onChange(parseInt(v, 10))}
                            value={field.value?.toString() ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {operatingDayOptions.map(d => (
                                <SelectItem key={d.value} value={d.value.toString()}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="dayOfMonth"
                      render={({ field }) => (
                        <FormItem className="min-w-0 space-y-1.5">
                          <FormLabel>Day</FormLabel>
                          <Select
                            onValueChange={v => field.onChange(parseInt(v, 10))}
                            value={field.value?.toString() ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Date" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <SelectItem key={d} value={d.toString()}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="col-span-2 grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2 sm:gap-x-2">
                    <FormField
                      control={form.control}
                      name="startHour"
                      render={({ field }) => (
                        <FormItem className="min-w-0 space-y-1.5">
                          <FormLabel>Start</FormLabel>
                          <Select
                            onValueChange={v => field.onChange(parseInt(v, 10))}
                            value={field.value?.toString() ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HOUR_OPTIONS.filter(
                                h => h.value >= shopHours.openHour && h.value < shopHours.closeHour
                              ).map(h => (
                                <SelectItem key={h.value} value={h.value.toString()}>
                                  {h.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex min-w-0 flex-row items-end gap-2">
                      <FormField
                        control={form.control}
                        name="durationHours"
                        render={({ field }) => {
                          const sh = startHour ?? shopHours.openHour;
                          const currentEnd = roundToHalfHour(sh + (field.value ?? 0.5));
                          const match = stopSlotOptions.find(
                            o => Math.abs(o.end - currentEnd) < 0.01
                          );
                          const selectValue =
                            match != null
                              ? String(match.end)
                              : stopSlotOptions[0] != null
                                ? String(stopSlotOptions[0].end)
                                : '';
                          return (
                            <FormItem className="min-w-0 flex-1 space-y-1.5">
                              <FormLabel>Stop</FormLabel>
                              <Select
                                value={selectValue}
                                onValueChange={v => {
                                  const endNum = parseFloat(v);
                                  field.onChange(roundToHalfHour(endNum - sh));
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="End" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {stopSlotOptions.map((o, i) => (
                                    <SelectItem key={o.end} value={String(o.end)}>
                                      {i === stopSlotOptions.length - 1
                                        ? `${o.label} (close)`
                                        : o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 px-2.5 text-xs"
                        disabled={
                          shopHours.closeHour <= shopHours.openHour || isFullBusinessDaySelected
                        }
                        onClick={applyFullBusinessDay}
                      >
                        All day
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem className="flex min-h-0 min-w-0 flex-1 flex-col space-y-2">
                        <FormLabel className="flex h-5 items-center">Note</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Optional details for your team…"
                            rows={4}
                            className="min-h-[100px] flex-1 resize-y sm:min-h-[120px]"
                            autoComplete="off"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resourceIds"
                    render={() => {
                      const selectedIds = form.watch('resourceIds') ?? [];
                      const allTechniciansSelected =
                        schedulableIds.length > 0 &&
                        schedulableIds.every(id => selectedIds.includes(id));

                      return (
                        <FormItem className="flex min-h-0 w-full shrink-0 flex-col space-y-2 sm:w-[12.5rem] md:w-[13.5rem]">
                          <div className="flex h-5 items-center justify-between gap-2">
                            <FormLabel className="mb-0 min-w-0 flex-1">Technicians</FormLabel>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto shrink-0 px-0 py-0 text-xs font-normal leading-none"
                              disabled={schedulableIds.length === 0 || allTechniciansSelected}
                              onClick={() => {
                                form.setValue('resourceIds', [...schedulableIds], {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              Select all
                            </Button>
                          </div>
                          <div className="max-h-48 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2">
                            {schedulable.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No active technicians.
                              </p>
                            ) : (
                              schedulable.map(r => {
                                const id = r._id ?? '';
                                const selected = selectedIds.includes(id);
                                return (
                                  <label
                                    key={id || r.name}
                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-muted/60"
                                  >
                                    <Checkbox
                                      checked={selected}
                                      onCheckedChange={checked => {
                                        const cur = form.getValues('resourceIds') ?? [];
                                        if (checked) {
                                          form.setValue('resourceIds', [...cur, id], {
                                            shouldDirty: true,
                                          });
                                        } else {
                                          form.setValue(
                                            'resourceIds',
                                            cur.filter(x => x !== id),
                                            { shouldDirty: true }
                                          );
                                        }
                                      }}
                                    />
                                    <TechnicianColorSwatch colorKey={r.color} size="xs" />
                                    <span className="min-w-0 truncate">{r.name}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
              </div>

              {Object.keys(form.formState.errors).length > 0 ? (
                <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                  <h4 className="mb-2 text-sm font-medium text-destructive">Please fix:</h4>
                  <ul className="list-inside list-disc text-sm text-destructive">
                    {Object.entries(form.formState.errors).map(([key, value]) => (
                      <li key={key}>
                        {key}: {value.message?.toString() ?? 'Invalid'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <DrawerFooter className="mt-auto shrink-0 gap-2 border-t bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 max-md:px-3 md:pt-2">
              <div className="flex w-full min-w-0 flex-col gap-2 md:hidden">
                {editing && onDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-h-10 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteFromDrawer}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                ) : null}
                <div className="flex w-full min-w-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-h-10 flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    Close
                  </Button>
                  <Button type="submit" variant="solid" className="h-10 min-h-10 flex-1">
                    {editing ? 'Save' : 'Add'}
                  </Button>
                </div>
              </div>
              <div className="hidden w-full min-w-0 items-center justify-between gap-2 md:flex">
                <div className="min-w-0">
                  {editing && onDelete ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={handleDeleteFromDrawer}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Delete
                    </Button>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Close
                  </Button>
                  <Button type="submit" variant="solid">
                    {editing ? 'Save' : 'Add'}
                  </Button>
                </div>
              </div>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
