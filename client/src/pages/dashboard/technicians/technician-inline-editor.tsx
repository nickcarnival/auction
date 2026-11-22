import { applyResourceOrderPatches } from '@/components/resources/apply-resource-order-patches';
import { ColorPicker } from '@/components/resources/color-picker';
import { useResourceContext } from '@/components/resources/resource-context';
import { SortOrderField } from '@/components/resources/sort-order-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { YesNoSegment } from '@/components/ui/yes-no-segment';
import { WeeklyOffDaysPicker } from '@/components/resources/weekly-off-days-picker';
import type { Resource } from '@shared/resource';
import { resourceSchema } from '@shared/schemas/resource-schema';
import {
  cohortResourcesOfType,
  cohortSlotOneIndexed,
  computeCompactOrderUpdates,
  technicianCohortType,
} from '@shared/technician-cohort-order';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const AUTO_SAVE_DEBOUNCE_MS = 1200;

const INLINE_SAVED_TOAST_ID = 'technician-inline-saved';

function buildPayload(base: Resource & { _id: string }, patch: Partial<Resource>) {
  return {
    ...base,
    ...patch,
    email: patch.email ?? base.email ?? '',
  };
}

async function persistResource(
  base: Resource & { _id: string },
  patch: Partial<Resource>,
  updateResource: (r: Resource) => Promise<unknown>
) {
  const merged = buildPayload(base, patch);
  const parsed = resourceSchema.safeParse({
    _id: merged._id,
    name: merged.name,
    email: merged.email === '' || merged.email == null ? '' : merged.email,
    color: merged.color,
    tenantId: merged.tenantId,
    isActive: merged.isActive ?? true,
    order: merged.order,
    weeklyOffDays: merged.weeklyOffDays ?? [],
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(first?.message ?? 'Invalid technician details');
  }

  await updateResource({
    ...base,
    ...parsed.data,
    _id: base._id,
  });
}

interface TechnicianInlineEditorProps {
  resource: Resource & { _id: string };
}

export function TechnicianInlineEditor({ resource }: TechnicianInlineEditorProps) {
  const { updateResource, resources, setResources } = useResourceContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState(resource.name);
  const [email, setEmail] = useState(resource.email ?? '');
  const [color, setColor] = useState(resource.color ?? 'Purple');
  const [isActive, setIsActive] = useState(resource.isActive ?? true);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>(() =>
    [...(resource.weeklyOffDays ?? [])].sort((a, b) => a - b)
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const textSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skip one debounced run right after syncing from server so we don’t re-save the same payload */
  const skipNextTextDebounceRef = useRef(false);

  useEffect(() => {
    skipNextTextDebounceRef.current = true;
    setName(resource.name);
    setEmail(resource.email ?? '');
    setColor(resource.color ?? 'Purple');
    setIsActive(resource.isActive ?? true);
    setWeeklyOffDays([...(resource.weeklyOffDays ?? [])].sort((a, b) => a - b));
    setNameError(null);
    setEmailError(null);
    setOrderError(null);
    // Intentionally only when switching technicians — avoids clobbering drafts while a save + refetch races.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource._id]);

  useEffect(() => {
    if (skipNextTextDebounceRef.current) {
      skipNextTextDebounceRef.current = false;
      return;
    }

    if (textSaveTimerRef.current) {
      clearTimeout(textSaveTimerRef.current);
    }

    textSaveTimerRef.current = setTimeout(() => {
      textSaveTimerRef.current = null;
      const emailTrimmed = email.trim();
      const normalizedEmail = emailTrimmed === '' ? '' : emailTrimmed;

      if (name === resource.name && normalizedEmail === (resource.email ?? '')) {
        return;
      }

      void (async () => {
        try {
          setNameError(null);
          setEmailError(null);
          await persistResource(resource, { name, email: normalizedEmail }, updateResource);
          toast.success('Technician saved', { id: INLINE_SAVED_TOAST_ID });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not save';
          if (message.toLowerCase().includes('email') || message.includes('@')) {
            setEmailError(message);
          } else {
            setNameError(message);
          }
          toast.error(message);
          skipNextTextDebounceRef.current = true;
          setName(resource.name);
          setEmail(resource.email ?? '');
        }
      })();
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (textSaveTimerRef.current) {
        clearTimeout(textSaveTimerRef.current);
        textSaveTimerRef.current = null;
      }
    };
  }, [name, email, resource, updateResource]);

  const orderSlot = useMemo(
    () => cohortSlotOneIndexed(resources, resource._id),
    [resources, resource._id]
  );

  const maxOrderSlot = useMemo(
    () => cohortResourcesOfType(resources, technicianCohortType(resource)).length,
    [resources, resource]
  );

  const onOrderChange = async (newSlot: number) => {
    if (cohortSlotOneIndexed(resources, resource._id) === newSlot) {
      return;
    }
    const updates = computeCompactOrderUpdates(resources, resource._id, newSlot);
    if (updates.length === 0) {
      return;
    }
    try {
      setOrderError(null);
      applyResourceOrderPatches(updates, setResources, queryClient);
      const snap = resources;
      for (const u of updates) {
        const base = snap.find(r => r._id === u._id);
        if (base?._id) {
          await persistResource(base as Resource & { _id: string }, { order: u.order }, updateResource);
        }
      }
      toast.success('Technician saved', { id: INLINE_SAVED_TOAST_ID });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save order';
      setOrderError(message);
      toast.error(message);
      void queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  };

  const onColorChange = async (next: string) => {
    setColor(next);
    if (next === resource.color) {
      return;
    }
    try {
      await persistResource(resource, { color: next }, updateResource);
      toast.success('Technician saved', { id: INLINE_SAVED_TOAST_ID });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save color';
      toast.error(message);
      setColor(resource.color ?? 'Purple');
    }
  };

  const onWeeklyOffDaysChange = async (next: number[]) => {
    const normalized = [...next].sort((a, b) => a - b);
    const prev = [...(resource.weeklyOffDays ?? [])].sort((a, b) => a - b);
    setWeeklyOffDays(normalized);
    if (
      normalized.length === prev.length &&
      normalized.every((d, i) => d === prev[i])
    ) {
      return;
    }
    try {
      await persistResource(resource, { weeklyOffDays: normalized }, updateResource);
      toast.success('Technician saved', { id: INLINE_SAVED_TOAST_ID });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save schedule';
      toast.error(message);
      setWeeklyOffDays(prev);
    }
  };

  const onActiveChange = async (next: boolean) => {
    const prevActive = isActive;
    setIsActive(next);
    if (next === (resource.isActive ?? true)) {
      return;
    }
    try {
      await persistResource(resource, { isActive: next }, updateResource);
      toast.success('Technician saved', { id: INLINE_SAVED_TOAST_ID });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update status';
      toast.error(message);
      setIsActive(prevActive);
    }
  };

  const labelClass = 'text-xs font-medium text-muted-foreground';

  return (
    <div className="w-full rounded-lg border border-border bg-card px-3 py-3 text-left shadow-sm sm:px-4 sm:py-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4">
        <div className="space-y-1.5">
          <Label htmlFor={`technician-name-${resource._id}`} className={labelClass}>
            Name
          </Label>
          <Input
            id={`technician-name-${resource._id}`}
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            className="h-9"
            aria-invalid={nameError != null}
          />
          {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`technician-email-${resource._id}`} className={labelClass}>
            Email
          </Label>
          <Input
            id={`technician-email-${resource._id}`}
            type="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className="h-9"
            aria-invalid={emailError != null}
          />
          {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className={labelClass}>Calendar color</p>
        <div className="rounded-md border border-border/80 bg-muted/20 px-2 py-1.5">
          <ColorPicker compact value={color} onChange={onColorChange} />
        </div>
      </div>

      <div className="mt-3">
        <WeeklyOffDaysPicker
          idSuffix={resource._id}
          legendClassName={labelClass}
          value={weeklyOffDays}
          onChange={v => {
            void onWeeklyOffDaysChange(v);
          }}
        />
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <SortOrderField
            id={`technician-order-${resource._id}`}
            labelClassName={labelClass}
            value={orderSlot}
            maxSlot={Math.max(1, maxOrderSlot)}
            onChange={next => {
              void onOrderChange(next);
            }}
            error={orderError}
          />
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            <Label className="text-xs font-medium text-foreground">On schedule</Label>
            <YesNoSegment
              value={isActive}
              onChange={onActiveChange}
              aria-label="On schedule"
              className="shrink-0 sm:max-w-[11rem] sm:flex-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
