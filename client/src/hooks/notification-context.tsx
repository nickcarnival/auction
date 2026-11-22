import { BASE_URL } from '@/utils/environment-util';
import { fetchJsonArrayOrThrow, fetchJsonOrThrow } from '@/lib/api-response';
import { bookingQueueCountResponseSchema } from '@/lib/booking-queue-count-schema';
import { invalidateBookingQueueCounts } from '@/lib/invalidate-booking-queue-counts';
import { readResponseErrorMessage } from '@shared/read-response-error-message';
import { BookingRequest, type BookingRequestQueue } from '@shared/booking';
import {
  keepPreviousData,
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';

/** Search param for request detail drawer / permalink (e.g. `/dashboard/requests?request=<id>`). */
export const REQUEST_DETAIL_SEARCH_PARAM = 'request';

function requestQueueFromSearchParams(raw: string | null): BookingRequestQueue {
  if (
    raw === 'confirmed' ||
    raw === 'rejected' ||
    raw === 'pending' ||
    raw === 'followups'
  ) {
    return raw;
  }
  return 'pending';
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface NotificationContextType {
  notifications: BookingRequest[] | undefined;
  isLoading: boolean;
  /** True only when there is no data yet (first load); tab switches use placeholder data instead. */
  isRequestsPending: boolean;
  requestQueue: BookingRequestQueue;
  setRequestQueue: (queue: BookingRequestQueue) => void;
  /** Current `request` URL param when the drawer is open (permalink target). */
  requestDetailId: string | null;
  /** Resolved booking for the drawer; null while loading or when param absent. */
  activeNotification: BookingRequest | null;
  isRequestDetailLoading: boolean;
  selectedNotifications: string[];
  sortConfig: SortConfig;
  toggleNotificationSelection: (id: string) => void;
  openNotificationDetails: (notification: BookingRequest) => void;
  closeNotificationDetails: () => void;
  handleSort: (field: string) => void;
  markAsReadMutation: UseMutationResult<void, Error, string[], unknown>;
  markAsUnreadMutation: UseMutationResult<void, Error, string[], unknown>;

  unreadQuery: UseQueryResult<BookingRequest[], Error>;
  rejectBookingMutation: UseMutationResult<void, Error, string, unknown>;
  updateFollowUpMutation: UseMutationResult<
    void,
    Error,
    { id: string; followUpAt: string | null; followUpNote?: string | null },
    unknown
  >;

  /** Follow-ups queue size (same filters as the Follow-ups tab); powers the tab badge. */
  followUpsCountQuery: UseQueryResult<number, Error>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'created',
    direction: 'desc',
  });
  const queryClient = useQueryClient();
  const markedReadForDetailIdRef = useRef<string | null>(null);

  const requestDetailId = searchParams.get(REQUEST_DETAIL_SEARCH_PARAM);

  const requestQueue = useMemo(
    () => requestQueueFromSearchParams(searchParams.get('queue')),
    [searchParams]
  );

  const setRequestQueue = useCallback(
    (queue: BookingRequestQueue) => {
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          if (queue === 'pending') {
            next.delete('queue');
          } else {
            next.set('queue', queue);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const {
    data: notifications,
    isLoading,
    isPending: isRequestsPending,
  } = useQuery({
    queryKey: ['all-notifications', requestQueue, sortConfig.field, sortConfig.direction],
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction,
        queue: requestQueue,
      });

      const response = await fetch(`${BASE_URL}/api/bookings/get-all?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      return fetchJsonArrayOrThrow<BookingRequest>(response, 'Failed to load booking requests');
    },
    retry: false,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (
      (requestQueue !== 'pending' && requestQueue !== 'followups') ||
      notifications === undefined
    ) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    invalidateBookingQueueCounts(queryClient);
  }, [notifications, requestQueue, queryClient]);

  const notInCurrentList = Boolean(
    requestDetailId &&
      notifications !== undefined &&
      !notifications.some(n => n._id === requestDetailId)
  );

  const { data: requestFromParam, isError: requestDetailFetchError } = useQuery({
    queryKey: ['booking-request-by-id', requestDetailId],
    queryFn: async (): Promise<BookingRequest> => {
      const response = await fetch(`${BASE_URL}/api/bookings/get-by-id/${requestDetailId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Booking request not found'));
      }
      return response.json() as Promise<BookingRequest>;
    },
    enabled: Boolean(requestDetailId && notInCurrentList),
    retry: false,
  });

  const activeNotification = useMemo((): BookingRequest | null => {
    if (!requestDetailId) {
      return null;
    }
    const fromList = notifications?.find(n => n._id === requestDetailId);
    if (fromList) {
      return fromList;
    }
    return requestFromParam ?? null;
  }, [requestDetailId, notifications, requestFromParam]);

  const isRequestDetailLoading = Boolean(
    requestDetailId &&
      !requestDetailFetchError &&
      !activeNotification &&
      (notifications === undefined || notInCurrentList)
  );

  const unreadQuery = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/bookings/get-unread`, {
        method: 'GET',
        credentials: 'include',
      });
      return fetchJsonArrayOrThrow<BookingRequest>(response, 'Failed to load unread requests');
    },
    retry: false,
    refetchInterval: 1000 * 60,
  });

  const followUpsCountQuery = useQuery({
    queryKey: ['booking-queue-count', 'followups'],
    queryFn: async () => {
      const params = new URLSearchParams({ queue: 'followups' });
      const response = await fetch(`${BASE_URL}/api/bookings/queue-count?${params}`, {
        method: 'GET',
        credentials: 'include',
      });
      const body = await fetchJsonOrThrow<unknown>(response, 'Failed to load follow-ups count');
      return bookingQueueCountResponseSchema.parse(body).count;
    },
    retry: false,
    refetchInterval: 1000 * 60,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch(`${BASE_URL}/api/bookings/mark-as-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`${BASE_URL}/api/bookings/mark-as-unread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        throw new Error(await readResponseErrorMessage(response, 'Failed to mark as unread'));
      }
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      for (const id of ids) {
        queryClient.invalidateQueries({ queryKey: ['booking-request-by-id', id] });
      }
    },
  });

  const rejectBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${BASE_URL}/api/bookings/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to reject booking request')
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      invalidateBookingQueueCounts(queryClient);
    },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async ({
      id,
      followUpAt,
      followUpNote,
    }: {
      id: string;
      followUpAt: string | null;
      followUpNote?: string | null;
    }) => {
      const body: {
        id: string;
        followUpAt: string | null;
        followUpNote?: string | null;
      } = { id, followUpAt };
      if (followUpNote !== undefined) {
        body.followUpNote = followUpNote;
      }
      const response = await fetch(`${BASE_URL}/api/bookings/follow-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(
          await readResponseErrorMessage(response, 'Failed to update follow-up date')
        );
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['all-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      invalidateBookingQueueCounts(queryClient);
      queryClient.invalidateQueries({ queryKey: ['booking-request-by-id', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-booking-requests'] });
    },
  });

  useEffect(() => {
    if (!requestDetailId) {
      markedReadForDetailIdRef.current = null;
      return;
    }
    if (!activeNotification || activeNotification._id !== requestDetailId) {
      return;
    }
    if (activeNotification.readAt) {
      markedReadForDetailIdRef.current = requestDetailId;
      return;
    }
    if (markedReadForDetailIdRef.current === requestDetailId) {
      return;
    }
    markedReadForDetailIdRef.current = requestDetailId;
    markAsReadMutation.mutate([requestDetailId]);
  }, [requestDetailId, activeNotification, markAsReadMutation.mutate, markAsReadMutation]);

  useEffect(() => {
    if (!requestDetailFetchError || !requestDetailId) {
      return;
    }
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete(REQUEST_DETAIL_SEARCH_PARAM);
        return next;
      },
      { replace: true }
    );
  }, [requestDetailFetchError, requestDetailId, setSearchParams]);

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id) ? prev.filter(notifId => notifId !== id) : [...prev, id]
    );
  };

  const openNotificationDetails = useCallback(
    (notification: BookingRequest) => {
      markedReadForDetailIdRef.current = notification._id;
      markAsReadMutation.mutate([notification._id]);
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set(REQUEST_DETAIL_SEARCH_PARAM, notification._id);
          return next;
        },
        { replace: false }
      );
    },
    [markAsReadMutation, setSearchParams]
  );

  const closeNotificationDetails = useCallback(() => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete(REQUEST_DETAIL_SEARCH_PARAM);
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        isLoading,
        isRequestsPending,
        requestQueue,
        setRequestQueue,
        requestDetailId,
        activeNotification,
        isRequestDetailLoading,
        selectedNotifications,
        sortConfig,
        toggleNotificationSelection,
        openNotificationDetails,
        closeNotificationDetails,
        handleSort,
        markAsReadMutation,
        markAsUnreadMutation,

        unreadQuery,
        rejectBookingMutation,
        updateFollowUpMutation,
        followUpsCountQuery,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
