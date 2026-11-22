import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { DEFAULT_PENDING_REQUEST_STALE_DAYS, Tenant } from '@shared/tenant';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BASE_URL } from '@/utils/environment-util';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldNamesMarkedBoolean } from 'react-hook-form';
import { useForm, useWatch } from 'react-hook-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Form } from '@/components/ui/form/form';
import { useDebounce } from '@/hooks/use-debounce';
import { holidayListItemSchema } from '@shared/holidays/holiday';
import { DEFAULT_SHOP_HOURS } from '@shared/shop-hours';
import { useAuth } from '@/pages/auth/auth-provider';
import { toast } from 'sonner';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { OperationsBusinessProfileCard } from './operations/operations-business-profile-card';
import { OperationsBusinessHoursCard } from './operations/operations-business-hours-card';
import { OperationsHolidaysCard } from './operations/operations-holidays-card';
import { OperationsRecurringBlocksCard } from './operations/operations-recurring-blocks-card';
import { OperationsPendingRequestsCard } from './operations/operations-pending-requests-card';
import { operationsFormSchema, type OperationsFormType } from './operations/operations-constants';
import { normalizeShopClosedDates } from '@shared/holidays/tenant-closed-dates';

const OPERATIONS_AUTOSAVE_DEBOUNCE_MS = 850;
const OPERATIONS_SAVED_TOAST_ID = 'operations-settings-saved';

function serializeOperationsFormPayload(payload: OperationsFormType): string {
  return JSON.stringify({
    shopHours: payload.shopHours,
    observedHolidayIds: payload.observedHolidayIds,
    shopClosedDates: normalizeShopClosedDates(payload.shopClosedDates),
    pendingRequestStaleDays: payload.pendingRequestStaleDays,
  });
}

function serializeOperationsFromTenant(tenant: Tenant): string {
  return serializeOperationsFormPayload({
    shopHours: tenant.shopHours ?? DEFAULT_SHOP_HOURS,
    observedHolidayIds: tenant.observedHolidayIds ?? [],
    shopClosedDates:
      tenant.shopClosedDates?.map(e => ({
        date: e.date,
        note: e.note ?? '',
      })) ?? [],
    pendingRequestStaleDays:
      tenant.pendingRequestStaleDays ?? DEFAULT_PENDING_REQUEST_STALE_DAYS,
  });
}

function closedDatesFromTenant(tenant: Tenant | undefined): OperationsFormType['shopClosedDates'] {
  return (
    tenant?.shopClosedDates?.map(e => ({
      date: e.date,
      note: e.note ?? '',
    })) ?? []
  );
}

/** True when react-hook-form marks a whole branch (e.g. field array) as dirty. */
function isFormBranchDirty(value: unknown): boolean {
  if (value === undefined || value === false) return false;
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(v => isFormBranchDirty(v));
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(v => isFormBranchDirty(v));
  }
  return Boolean(value);
}

/**
 * For each branch, use live form values only if that branch is dirty; otherwise use the latest
 * tenant from the query cache. That way editing hours cannot wipe closed dates/holidays and editing
 * closed days cannot wipe hours (avoids stale slices in controlled-form + debounce snapshots).
 */
function buildPersistedOperationsPayload(
  formData: OperationsFormType,
  dirty: FieldNamesMarkedBoolean<OperationsFormType>,
  serverTenant: Tenant | undefined
): OperationsFormType {
  return {
    shopHours: isFormBranchDirty(dirty.shopHours)
      ? formData.shopHours
      : (serverTenant?.shopHours ?? DEFAULT_SHOP_HOURS),
    observedHolidayIds: isFormBranchDirty(dirty.observedHolidayIds)
      ? formData.observedHolidayIds
      : (serverTenant?.observedHolidayIds ?? []),
    shopClosedDates: isFormBranchDirty(dirty.shopClosedDates)
      ? formData.shopClosedDates
      : closedDatesFromTenant(serverTenant),
    pendingRequestStaleDays: dirty.pendingRequestStaleDays
      ? formData.pendingRequestStaleDays
      : (serverTenant?.pendingRequestStaleDays ?? DEFAULT_PENDING_REQUEST_STALE_DAYS),
  };
}

export function OperationsTab() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const queryClient = useQueryClient();
  const location = useLocation();

  const { data, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant-by-id', tenantId],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/tenants/get-by-id?_id=${tenantId}`, {
        credentials: 'include',
      });
      return await response.json();
    },
    enabled: !!tenantId,
  });

  const {
    data: holidays = [],
    isLoading: holidaysLoading,
    isError: holidaysError,
  } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/holidays`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to load holidays')
        );
      }
      const json: unknown = await response.json();
      return holidayListItemSchema.array().parse(json);
    },
  });

  const form = useForm<OperationsFormType>({
    resolver: zodResolver(operationsFormSchema),
    defaultValues: {
      shopHours: DEFAULT_SHOP_HOURS,
      observedHolidayIds: [],
      shopClosedDates: [],
      pendingRequestStaleDays: DEFAULT_PENDING_REQUEST_STALE_DAYS,
    },
    values: {
      shopHours: data?.shopHours ?? DEFAULT_SHOP_HOURS,
      observedHolidayIds: data?.observedHolidayIds ?? [],
      shopClosedDates:
        data?.shopClosedDates?.map(e => ({
          date: e.date,
          note: e.note ?? '',
        })) ?? [],
      pendingRequestStaleDays:
        data?.pendingRequestStaleDays ?? DEFAULT_PENDING_REQUEST_STALE_DAYS,
    },
    // Refetch after save updates `values`; without this, a second edit in flight can be wiped
    // before its autosave runs (same form, but controlled reset overwrote dirty fields).
    resetOptions: { keepDirtyValues: true },
  });

  const openHour = form.watch('shopHours.openHour');
  const closeHour = form.watch('shopHours.closeHour');

  useEffect(() => {
    if (openHour === undefined || closeHour === undefined) return;
    if (closeHour > openHour) return;
    const bumpedClose = Math.min(openHour + 1, 23);
    if (bumpedClose > openHour) {
      form.setValue('shopHours.closeHour', bumpedClose);
      return;
    }
    // openHour is 23 — same-day window cannot end after start; nudge once so validation can succeed
    form.setValue('shopHours.openHour', 22);
    form.setValue('shopHours.closeHour', 23);
  }, [openHour, closeHour, form]);

  const lastSavedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    lastSavedJsonRef.current = serializeOperationsFromTenant(data);
  }, [data]);

  const shopHoursLive = useWatch({ control: form.control, name: 'shopHours' });
  const watchedValues = useWatch({ control: form.control });
  const debouncedValues = useDebounce(watchedValues, OPERATIONS_AUTOSAVE_DEBOUNCE_MS);

  // Subscribe so dirtyFields reflects the latest branch edits (required for RHF formState proxy).
  const { dirtyFields } = form.formState;

  const { mutate, isPending: isSavePending } = useMutation({
    mutationFn: async (formData: OperationsFormType) => {
      const response = await fetch(`${BASE_URL}/api/tenants/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          _id: tenantId,
          shopHours: formData.shopHours,
          observedHolidayIds: formData.observedHolidayIds,
          shopClosedDates: normalizeShopClosedDates(formData.shopClosedDates),
          pendingRequestStaleDays: formData.pendingRequestStaleDays,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to update operations settings')
        );
      }

      return response.json();
    },
    onSuccess: (_returns, variables) => {
      lastSavedJsonRef.current = serializeOperationsFormPayload(variables);
      queryClient.invalidateQueries({ queryKey: ['tenant-by-id'] });
      queryClient.invalidateQueries({ queryKey: ['user-by-token'] });
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      toast.success('Operations saved', { id: OPERATIONS_SAVED_TOAST_ID });
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : 'Failed to save operations settings');
    },
  });

  useEffect(() => {
    if (!tenantId || !data || debouncedValues == null || watchedValues == null) return;
    // One save at a time; when this flips false after a save, the effect re-runs and can flush
    // additional edits the user made while the request was in flight.
    if (isSavePending) return;

    const parsedDebounced = operationsFormSchema.safeParse(debouncedValues);
    if (!parsedDebounced.success) return;

    const parsedWatched = operationsFormSchema.safeParse(watchedValues);
    if (!parsedWatched.success) return;

    // Avoid saving while debounce is behind live form (e.g. right after tenant hydrates).
    if (
      serializeOperationsFormPayload(parsedWatched.data) !==
      serializeOperationsFormPayload(parsedDebounced.data)
    ) {
      return;
    }

    const live = form.getValues();
    const parsedLive = operationsFormSchema.safeParse(live);
    if (!parsedLive.success) return;

    const serverTenant =
      queryClient.getQueryData<Tenant>(['tenant-by-id', tenantId]) ?? data;
    const persisted = buildPersistedOperationsPayload(
      parsedLive.data,
      dirtyFields,
      serverTenant
    );
    const nextKey = serializeOperationsFormPayload(persisted);
    if (nextKey === lastSavedJsonRef.current) return;

    mutate(persisted);
  }, [
    tenantId,
    data,
    debouncedValues,
    watchedValues,
    mutate,
    dirtyFields,
    queryClient,
    form,
    isSavePending,
  ]);

  useEffect(() => {
    if (location.hash !== '#recurring-events') return;
    if (isLoading || !data || holidaysLoading || holidaysError) return;
    const id = window.setTimeout(() => {
      document.querySelector('#recurring-events')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
    return () => clearTimeout(id);
  }, [location, isLoading, data, holidaysLoading, holidaysError]);

  if (isLoading || !data || holidaysLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (holidaysError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Holidays could not be loaded. Refresh the page or try again later.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <OperationsBusinessProfileCard tenantId={tenantId} tenant={data} />

      <Form {...form}>
        <div className="space-y-6">
          <OperationsBusinessHoursCard form={form} openHour={openHour} />
          <OperationsPendingRequestsCard form={form} />
          <OperationsRecurringBlocksCard
            tenantId={tenantId}
            shopHours={shopHoursLive ?? data.shopHours ?? DEFAULT_SHOP_HOURS}
            blocks={data.recurringScheduleBlocks ?? []}
          />
          <OperationsHolidaysCard form={form} holidays={holidays} />
        </div>
      </Form>
    </div>
  );
}
