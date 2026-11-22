import { Appointment } from '@shared/appointment';
import { FORMAT, roundDuration } from '@shared/date-utils';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { useAppointmentContext } from './appointment-context';
import { SlotInfo, Event, View, Views } from 'react-big-calendar';
import {
  CALENDAR_SLOT_STEP_MINUTES,
  getDuration,
  getEndDate,
  snapMomentToCalendarStep,
  technicianWeeklyOffDaysForAppointment,
} from './duration';
import { markPlaceRequestPlacementConsumed } from './place-request-schedule-bridge';
import { useCustomerContext } from '../customers/customer-context';
import { useResourceContext } from '../resources/resource-context';
import { useShopHours } from '@/contexts/tenant-context';
import { isRecurringBlockCalendarAppointment } from '@shared/recurring-schedule-block-calendar';

const RECURRING_EVENTS_SETTINGS_PATH = '/dashboard/settings/operations#recurring-events';

export const useScheduleCalendar = () => {
  const navigate = useNavigate();
  const {
    updateAppointment,
    setCurrentAppointment,
    setCurrentDate,
    placementRequestDraft,
    setPlacementRequestDraft,
    highlightAppointmentId,
  } = useAppointmentContext();
  const [, setSearchParams] = useSearchParams();
  const { searchCustomers } = useCustomerContext();
  const shopHours = useShopHours();
  const { resources } = useResourceContext();

  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const selectView = useCallback((v: View) => {
    setView(v);
  }, []);

  useEffect(() => {
    if (highlightAppointmentId) {
      setView(Views.WORK_WEEK);
    }
  }, [highlightAppointmentId]);

  const handleNavigate = useCallback(
    (e: Date) => {
      const newDate = moment(e).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      // const oldDate = moment(currentDate).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

      setCurrentDate(newDate.toDate());

      // TODO: this file needs custom business day updates

      // going back, could be weekend
      // if (newDate.isBefore(oldDate)) {
      //     if (newDate.isoWeekday() <= 5) {
      //         setCurrentDate(e);
      //     } else if (newDate.isoWeekday() === 6) {
      //         setCurrentDate(moment(e).subtract(1, 'days').toDate());
      //         // 7
      //     } else {
      //         setCurrentDate(moment(e).subtract(2, 'days').toDate());
      //     }
      //     // going forward could be a weekend...
      // } else {
      //     if (newDate.isoWeekday() <= 5) {
      //         setCurrentDate(newDate.toDate());
      //     } else {
      //         setCurrentDate(moment(e).add(8 - newDate.isoWeekday(), 'days').toDate());
      //     }
      // }
    },
    [setCurrentDate]
  );

  const onEventResize = useCallback(
    async (data: EventInteractionArgs<Event>) => {
      const { event, start, end, resourceId } = data;

      const appointment = event as Appointment;
      if (isRecurringBlockCalendarAppointment(appointment)) return;

      const _id = appointment._id?.toString();
      const _resourceId = resourceId as string | undefined;

      const _start = moment(start).format(FORMAT);
      const _end = moment(end).format(FORMAT);

      const rid = (_resourceId || appointment.resourceId || '').trim();
      const weeklyOff = resources.find(r => r._id === rid)?.weeklyOffDays;

      const duration = getDuration({
        start: _start,
        end: _end,
        appointment,
        shopHours,
        technicianWeeklyOffDays: weeklyOff?.length ? weeklyOff : null,
      });

      updateAppointment({
        ...appointment,
        duration,
        start: _start,
        resourceId: _resourceId || appointment.resourceId || '',
        _id: _id || appointment._id || '',
        customer: appointment.customer || '',
        status: appointment.status || '',
        notes: appointment.notes || '',
        phone: appointment.phone || null,
        email: appointment.email || null,
        vehicle: appointment.vehicle || '',
        service: appointment.service || '',
        checkedIn: appointment.checkedIn || false,
        reminded: appointment.reminded || false,
        tenantId: appointment.tenantId || '',
        isConfirmed: appointment.isConfirmed || false,
      });
    },
    [updateAppointment, resources, shopHours]
  );

  const onEventDrop = useCallback(
    async (data: EventInteractionArgs<Event>) => {
      const { event, start, resourceId } = data;

      const appointment = event as Appointment;
      if (isRecurringBlockCalendarAppointment(appointment)) return;

      const _id = appointment._id?.toString();
      const _resourceId = resourceId as string | undefined;

      const _start = snapMomentToCalendarStep(moment(start));

      updateAppointment({
        ...appointment,
        start: _start.format(FORMAT),
        resourceId: _resourceId || appointment.resourceId || '',
        _id: _id || appointment._id || '',
        customer: appointment.customer || '',
        status: appointment.status || '',
        duration: appointment.duration || 0.5,
        notes: appointment.notes || '',
        phone: appointment.phone || null,
        email: appointment.email || null,
        vehicle: appointment.vehicle || '',
        service: appointment.service || '',
        checkedIn: appointment.checkedIn || false,
        reminded: appointment.reminded || false,
        tenantId: appointment.tenantId || '',
        isConfirmed: appointment.isConfirmed || false,
      });
    },
    [updateAppointment]
  );

  const onSelectEmptySlot = useCallback(
    (slotInfo: SlotInfo) => {
      searchCustomers('');

      if (placementRequestDraft) {
        const consumedId = placementRequestDraft.bookingRequestId?.trim();
        if (consumedId) markPlaceRequestPlacementConsumed(consumedId);

        const start = snapMomentToCalendarStep(moment(slotInfo.start)).format(FORMAT);
        const resourceId =
          ((slotInfo.resourceId as string) || placementRequestDraft.resourceId || '').trim();
        const duration =
          placementRequestDraft.duration != null && placementRequestDraft.duration >= 0.5
            ? placementRequestDraft.duration
            : 1.5;
        const weeklyOff = resources.find(r => r._id === resourceId)?.weeklyOffDays;

        const endDate = getEndDate({
          start,
          duration,
          shopHours,
          technicianWeeklyOffDays: weeklyOff?.length ? weeklyOff : null,
        });
        const end = moment(endDate).format(FORMAT);

        setCurrentAppointment({
          ...placementRequestDraft,
          resourceId,
          start,
          end,
          duration,
        });
        setPlacementRequestDraft(null);
        setSearchParams(
          prev => {
            const next = new URLSearchParams(prev);
            next.delete('placeRequest');
            return next;
          },
          { replace: true }
        );
        return;
      }

      const startM = snapMomentToCalendarStep(moment(slotInfo.start));
      let endM = snapMomentToCalendarStep(moment(slotInfo.end));
      if (endM.isSameOrBefore(startM)) {
        endM = startM.clone().add(CALENDAR_SLOT_STEP_MINUTES, 'minutes');
      }

      const start = startM.format(FORMAT);
      const end = endM.format(FORMAT);
      const duration = roundDuration(endM.diff(startM, 'hours', true));

      setCurrentAppointment({
        resourceId: slotInfo.resourceId as string,
        duration,
        customer: '',
        start,
        end,
        notes: '',
        phone: null,
        email: null,
        vehicle: '',
        service: '',
        checkedIn: false,
        status: '',
        reminded: false,
        tenantId: '',
        isConfirmed: false,
      });
    },
    [
      placementRequestDraft,
      resources,
      searchCustomers,
      setCurrentAppointment,
      setPlacementRequestDraft,
      setSearchParams,
      shopHours,
    ]
  );

  const onSelectEvent = useCallback(
    (data: Event) => {
      const { start, end } = data;

      const appointment = data as Appointment;
      if (isRecurringBlockCalendarAppointment(appointment)) {
        navigate(RECURRING_EVENTS_SETTINGS_PATH);
        return;
      }

      const _id = appointment._id?.toString();

      const _start = moment(start).format(FORMAT);
      const _end = moment(end).format(FORMAT);

      setCurrentAppointment({
        ...appointment,
        _id: _id || appointment._id || '',
        start: _start,
        end: _end,
        resourceId: appointment.resourceId || '',
        customer: appointment.customer || '',
        duration: appointment.duration || 0.5,
        notes: appointment.notes || '',
        phone: appointment.phone || null,
        email: appointment.email || null,
        vehicle: appointment.vehicle || '',
        service: appointment.service || '',
        checkedIn: appointment.checkedIn || false,
        status: appointment.status || '',
        reminded: appointment.reminded || false,
        tenantId: appointment.tenantId || '',
        isConfirmed: appointment.isConfirmed || false,
      });
    },
    [navigate, setCurrentAppointment]
  );

  const endAccessor = useCallback(
    (e: Event) => {
      const appointment = e as Appointment;

      if (isRecurringBlockCalendarAppointment(appointment)) {
        return moment(appointment.start)
          .add(appointment.duration ?? 0.5, 'hours')
          .toDate();
      }

      const endDate = getEndDate({
        start: appointment.start,
        duration: appointment.duration,
        shopHours,
        technicianWeeklyOffDays: technicianWeeklyOffDaysForAppointment(appointment, resources),
      });

      return endDate;
    },
    [resources, shopHours]
  );

  const startAccessor = useCallback((e: Event) => {
    const appointment = e as Appointment;
    return moment(appointment.start).toDate();
  }, []);

  return {
    onEventResize,
    endAccessor,
    startAccessor,
    onSelectEmptySlot,
    onSelectEvent,
    onEventDrop,
    view,
    selectView,
    handleNavigate,
  };
};
