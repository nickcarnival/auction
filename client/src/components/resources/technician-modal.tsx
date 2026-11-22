import { applyResourceOrderPatches } from '@/components/resources/apply-resource-order-patches';
import { SortOrderField } from '@/components/resources/sort-order-field';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ResourceSchemaType, resourceSchema } from '@shared/schemas/resource-schema';
import { useResourceContext } from './resource-context';
import { ColorPicker } from './color-picker';
import { WeeklyOffDaysPicker } from './weekly-off-days-picker';
import { useCallback, useEffect, useMemo, type KeyboardEvent } from 'react';
import { GenericField } from '../ui/form/generic-field';
import { YesNoSegment } from '@/components/ui/yes-no-segment';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router';
import { TECHNICIAN_ID_SEARCH_PARAM } from '@/lib/technician-settings-url';
import { toast } from 'sonner';
import {
  cohortResourcesOfType,
  cohortSlotOneIndexed,
  computeCompactOrderForNewTechnician,
  computeCompactOrderUpdates,
  technicianCohortType,
} from '@shared/technician-cohort-order';

function stopEnterSubmitInSingleLineInputs(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
    e.preventDefault();
  }
}

export const AddTechnician = () => {
  const {
    addResource,
    setCurrentResource,
    currentResource,
    updateResource,
    resources,
    setResources,
  } = useResourceContext();
  const queryClient = useQueryClient();
  const [, setSearchParams] = useSearchParams();

  const clearTechnicianSearchParam = () => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete(TECHNICIAN_ID_SEARCH_PARAM);
        return next;
      },
      { replace: true }
    );
  };

  const defaultValues = useMemo(() => {
    if (currentResource?._id) {
      const slot = cohortSlotOneIndexed(resources, currentResource._id);
      return {
        ...currentResource,
        weeklyOffDays: [...(currentResource.weeklyOffDays ?? [])].sort((a, b) => a - b),
        order:
          slot ??
          (typeof currentResource.order === 'number' && currentResource.order >= 1
            ? currentResource.order
            : undefined),
      };
    }
    const endActive = cohortResourcesOfType(resources, 'active').length + 1;
    return {
      _id: '',
      name: '',
      email: '',
      color: 'Purple',
      isActive: true,
      order: endActive,
      weeklyOffDays: [],
    };
  }, [currentResource, resources]);

  const form = useForm<ResourceSchemaType>({
    resolver: zodResolver(resourceSchema),
    defaultValues,
  });

  const isActiveWatch = form.watch('isActive') ?? true;

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const maxSlotForOrderField = useMemo(() => {
    if (currentResource?._id) {
      return Math.max(
        1,
        cohortResourcesOfType(resources, technicianCohortType(currentResource)).length
      );
    }
    return Math.max(
      1,
      cohortResourcesOfType(resources, isActiveWatch ? 'active' : 'inactive').length + 1
    );
  }, [currentResource, resources, isActiveWatch]);

  useEffect(() => {
    if (currentResource?._id != null) return;
    const m = maxSlotForOrderField;
    const cur = form.getValues('order');
    if (typeof cur === 'number' && cur > m) {
      form.setValue('order', m);
    }
  }, [currentResource?._id, form, maxSlotForOrderField]);

  const onClose = (open: boolean) => {
    if (!open) {
      clearTechnicianSearchParam();
      setCurrentResource(null);
    }
  };

  const persistCohortOrderInstant = useCallback(
    async (slot: number) => {
      const id = currentResource?._id;
      if (id == null) return;
      try {
        const updates = computeCompactOrderUpdates(resources, id, slot);
        if (updates.length === 0) return;
        const snap = resources;
        for (const u of updates) {
          const base = snap.find(r => r._id === u._id);
          if (base?._id) {
            await updateResource({ ...base, order: u.order, _id: u._id });
          }
        }
        toast.success('Technician saved', { id: 'technician-sheet-saved' });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save technician');
      }
    },
    [currentResource?._id, resources, updateResource]
  );

  async function onSubmit(values: ResourceSchemaType) {
    const isEdit = currentResource?._id != null;
    try {
      if (isEdit) {
        const id = currentResource._id;
        if (typeof values.order === 'number' && values.order >= 1) {
          const updates = computeCompactOrderUpdates(resources, id, values.order);
          if (updates.length > 0) {
            applyResourceOrderPatches(updates, setResources, queryClient);
          }
          const snap = resources;
          for (const u of updates) {
            const base = snap.find(r => r._id === u._id);
            if (base?._id) {
              await updateResource({ ...base, order: u.order, _id: u._id });
            }
          }
        }
        const rest = { ...values };
        delete rest.order;
        await updateResource({ ...rest, _id: id });
        toast.success('Technician saved');
      } else {
        const cohortType = values.isActive !== false ? 'active' : 'inactive';
        let orderForCreate: number | undefined;
        let preUpdates: Array<{ _id: string; order: number }> = [];
        if (typeof values.order === 'number' && values.order >= 1) {
          const r = computeCompactOrderForNewTechnician(resources, cohortType, values.order);
          preUpdates = r.updates;
          orderForCreate = r.newTechnicianOrder;
        }
        if (preUpdates.length > 0) {
          applyResourceOrderPatches(preUpdates, setResources, queryClient);
        }
        const snap = resources;
        for (const u of preUpdates) {
          const base = snap.find(r => r._id === u._id);
          if (base?._id) {
            await updateResource({ ...base, order: u.order, _id: u._id });
          }
        }
        const rest = { ...values };
        delete rest.order;
        await addResource({
          ...rest,
          _id: undefined,
          ...(orderForCreate != null ? { order: orderForCreate } : {}),
        });
        toast.success('Technician added');
      }
      clearTechnicianSearchParam();
      setCurrentResource(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save technician');
      void queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  }

  return (
    <Sheet open={currentResource != null} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>{currentResource?._id ? 'Edit' : 'Add'} Technician</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onKeyDown={stopEnterSubmitInSingleLineInputs}
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <GenericField placeholder="John Doe" name="name" label="Name" form={form} />

              <GenericField
                placeholder="john.doe@mail.com"
                name="email"
                label="Email"
                type="email"
                form={form}
              />

              <Controller
                name="order"
                control={form.control}
                render={({ field }) => (
                  <SortOrderField
                    value={
                      typeof field.value === 'number' &&
                      Number.isInteger(field.value) &&
                      field.value >= 1
                        ? field.value
                        : undefined
                    }
                    maxSlot={maxSlotForOrderField}
                    onChange={v => field.onChange(v)}
                    onInstantPersist={
                      currentResource?._id != null ? persistCohortOrderInstant : undefined
                    }
                  />
                )}
              />

              <Controller
                name="color"
                control={form.control}
                rules={{ required: 'Please select a color' }}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                    {error && <p className="text-destructive mt-1">{error.message}</p>}
                  </div>
                )}
              />

              <Controller
                name="weeklyOffDays"
                control={form.control}
                render={({ field }) => (
                  <WeeklyOffDaysPicker
                    idSuffix={currentResource?._id ?? 'new'}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <Label className="block w-full text-sm font-medium leading-none">
                      Active Technician
                    </Label>
                    <YesNoSegment
                      value={field.value ?? true}
                      onChange={field.onChange}
                      aria-label="Technician active status"
                    />
                  </div>
                )}
              />
            </div>
            <SheetFooter className="shrink-0 border-t bg-background px-6 py-4">
              <Button type="submit" variant="solid" className="w-full sm:w-auto">
                Save
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
