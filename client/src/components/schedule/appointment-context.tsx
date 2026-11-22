import { useAuth } from '@/pages/auth/auth-provider';
import { AppointmentSchemaType } from '@shared/schemas/appointment-schema';
import { BASE_URL } from '@/utils/environment-util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchJsonArrayOrThrow, throwApiFailure } from '@/lib/api-response';
import { invalidateBookingQueueCounts } from '@/lib/invalidate-booking-queue-counts';
import { scheduleFocusAppointmentHref } from '@/lib/schedule-focus-url';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';

interface ScheduleContextType {
  currentAppointment: AppointmentSchemaType | null;
  /**
   * When set, empty-slot clicks merge this draft with the chosen slot then open the appointment modal.
   * Booking requests use `bookingRequestId`; rescheduling uses a saved appointment (`_id` set, no new booking).
   */
  placementRequestDraft: AppointmentSchemaType | null;
  setPlacementRequestDraft: (draft: AppointmentSchemaType | null) => void;
  highlightAppointmentId: string | null;
  setHighlightAppointmentId: (id: string | null) => void;
  isEditing: boolean;
  isSubmitting: boolean;
  appointments: AppointmentSchemaType[];
  isLoadingAppointments: boolean;
  /** True while a refetch is in flight (including after `queryDate` changes). */
  isFetchingAppointments: boolean;
  /**
   * True while the list is an intentional empty placeholder (`[]`) for a new `queryDate` fetch,
   * not the resolved API result.
   */
  appointmentsQueryIsPlaceholder: boolean;
  currentDate: Date;
  /** Center date for the ±30d appointment fetch window; use for aligning synthetic events. */
  appointmentsFetchAnchor: Date;
  setCurrentDate: (x: Date) => void;
  setAppointments: Dispatch<SetStateAction<AppointmentSchemaType[]>>;
  setCurrentAppointment: (appointment: AppointmentSchemaType | null) => void;
  setIsEditing: (isEditing: boolean) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  addAppointment: (appointment: AppointmentSchemaType) => void;
  updateAppointment: (appointment: AppointmentSchemaType) => Promise<void>;
  deleteAppointment: (appointment: AppointmentSchemaType) => Promise<void>;
  remindAppointment: (appointment: AppointmentSchemaType) => Promise<unknown>;
  /** Navigate to schedule, jump to the appointment week, and highlight/spotlight it. */
  focusAppointmentOnSchedule: (
    appointmentId: string,
    anchorStart?: string | Date | null
  ) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// TODO: this probably needs custom business week logic
export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentDate, _setCurrentDate] = useState(moment().toDate());
  const [queryDate, setQueryDate] = useState(currentDate);

  const [appointments, setAppointments] = useState<AppointmentSchemaType[]>([]);
  const [currentAppointment, setCurrentAppointment] = useState<AppointmentSchemaType | null>(null);
  const [placementRequestDraft, setPlacementRequestDraft] = useState<AppointmentSchemaType | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightAppointmentId, setHighlightAppointmentId] = useState<string | null>(null);

  const { mutateAsync: deleteAppointment } = useMutation({
    mutationFn: async (appointment: AppointmentSchemaType) => {
      setAppointments(prev => {
        return prev.filter(x => x._id !== appointment._id);
      });

      const response = await fetch(`${BASE_URL}/api/appointments/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(appointment),
      });

      if (!response.ok) {
        await throwApiFailure(response, 'Failed to delete appointment');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] });
    },
  });

  const { mutateAsync: addAppointment } = useMutation({
    mutationFn: async (appointment: AppointmentSchemaType) => {
      const response = await fetch(`${BASE_URL}/api/appointments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointment),
        credentials: 'include',
      });

      if (!response.ok) {
        await throwApiFailure(response, 'Failed to add appointment');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      invalidateBookingQueueCounts(queryClient);
    },
  });

  const { mutateAsync: remindAppointment } = useMutation({
    mutationFn: async (appointment: AppointmentSchemaType) => {
      const response = await fetch(`${BASE_URL}/api/appointments/nudge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointment),
        credentials: 'include',
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          typeof body === 'object' &&
          body !== null &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : 'Failed to send reminder.';
        throw new Error(message);
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] });
    },
  });

  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isPlaceholderData } = useQuery<AppointmentSchemaType[]>({
    queryKey: ['get-all-appointments', queryDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `${BASE_URL}/api/appointments/get-all?start=${queryDate.toISOString()}`,
        { credentials: 'include' }
      );
      return fetchJsonArrayOrThrow<AppointmentSchemaType>(
        response,
        'Failed to load appointments'
      );
    },
    /**
     * After any successful load, a new `queryDate` window uses an empty placeholder instead of
     * stale appointments from the old window; UI shows “Loading appointments…” until the fetch lands.
     * First cold load keeps `undefined` so normal `isLoading` + full-page calendar skeleton still applies.
     */
    placeholderData: (previousData: AppointmentSchemaType[] | undefined) =>
      previousData === undefined ? undefined : [],
  });

  useEffect(() => {
    if (data !== undefined) {
      setAppointments(data);
    }
  }, [data]);

  const setCurrentDate = useCallback(
    (date: Date) => {
      if (Math.abs(moment(date).diff(moment(queryDate), 'days')) >= 15) {
        setQueryDate(date);
      }

      _setCurrentDate(date);
    },
    [queryDate]
  );

  // TODO: maybe make this a hook and maybe do more than invalidate...
  useEffect(() => {
    if (!user?.tenantId) return;

    let eventSource: EventSource | null = null;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const url = `${BASE_URL}/api/appointments/live-updates?tenantId=${user.tenantId}`;

    const connect = () => {
      if (cancelled) return;
      eventSource?.close();
      eventSource = new EventSource(url, { withCredentials: true });
      eventSource.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] });
      };
      eventSource.onerror = () => {
        console.error('EventSource failed; reconnecting shortly');
        eventSource?.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [queryClient, user?.tenantId]);

  const { mutateAsync: updateAppointment } = useMutation({
    mutationFn: async (appointment: AppointmentSchemaType) => {
      setAppointments(prev => {
        return prev.map(x => {
          if (x._id === appointment._id) {
            return appointment;
          }
          return x;
        });
      });

      const response = await fetch(`${BASE_URL}/api/appointments/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointment),
        credentials: 'include',
      });

      if (!response.ok) {
        await throwApiFailure(response, 'Failed to update appointment');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-all-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      invalidateBookingQueueCounts(queryClient);
    },
  });

  const focusAppointmentOnSchedule = useCallback(
    (appointmentId: string, anchorStart?: string | Date | null) => {
      const id = appointmentId.trim();
      if (!id) {
        return;
      }

      const resolveDay = (): moment.Moment | null => {
        if (anchorStart != null && anchorStart !== '') {
          const fromHint = moment(anchorStart);
          if (fromHint.isValid()) {
            return fromHint;
          }
        }
        const found = appointments.find(a => String(a._id) === String(id));
        if (found?.start) {
          const fromList = moment(found.start);
          if (fromList.isValid()) {
            return fromList;
          }
        }
        if (
          currentAppointment &&
          String(currentAppointment._id) === String(id) &&
          currentAppointment.start
        ) {
          const fromEditor = moment(currentAppointment.start);
          if (fromEditor.isValid()) {
            return fromEditor;
          }
        }
        return null;
      };

      const dayMoment = resolveDay();

      setCurrentAppointment(null);

      if (dayMoment) {
        setCurrentDate(dayMoment.startOf('day').toDate());
      }

      flushSync(() => {
        setHighlightAppointmentId(null);
      });
      setHighlightAppointmentId(id);
      const anchorForUrl = dayMoment?.toISOString() ?? anchorStart ?? null;
      navigate(scheduleFocusAppointmentHref(id, anchorForUrl));
    },
    [
      appointments,
      currentAppointment,
      navigate,
      setCurrentAppointment,
      setCurrentDate,
      setHighlightAppointmentId,
    ]
  );

  const value = useMemo(
    () => ({
      currentDate,
      appointmentsFetchAnchor: queryDate,
      currentAppointment,
      placementRequestDraft,
      setPlacementRequestDraft,
      highlightAppointmentId,
      setHighlightAppointmentId,
      isEditing,
      isLoadingAppointments: isLoading,
      isFetchingAppointments: isFetching,
      appointmentsQueryIsPlaceholder: isPlaceholderData,
      isSubmitting,
      appointments,
      setCurrentDate,
      setAppointments,
      setCurrentAppointment,
      setIsEditing,
      setIsSubmitting,
      addAppointment,
      updateAppointment,
      remindAppointment,
      deleteAppointment,
      focusAppointmentOnSchedule,
    }),
    [
      currentDate,
      queryDate,
      currentAppointment,
      placementRequestDraft,
      highlightAppointmentId,
      isEditing,
      isLoading,
      isFetching,
      isPlaceholderData,
      isSubmitting,
      appointments,
      setCurrentDate,
      setHighlightAppointmentId,
      addAppointment,
      updateAppointment,
      remindAppointment,
      deleteAppointment,
      focusAppointmentOnSchedule,
    ]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useAppointmentContext = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useAppointmentContext must be used within a ScheduleProvider');
  }
  return context;
};
