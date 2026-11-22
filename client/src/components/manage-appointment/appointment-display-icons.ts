/**
 * Single source for appointment-modal field icons — reuse in HoverCard strips and calendar.
 */
import {
  BadgeCheck,
  CalendarClock,
  Clock,
  Gauge,
  Palmtree,
  Pointer,
  UserRoundCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MotorbikeIcon } from './motorbike-icon';

export const appointmentFieldIcons = {
  bookingConfirmedYes: BadgeCheck,
  bookingConfirmedNo: CalendarClock,
  checkedInYes: UserRoundCheck,
  /** “Need bike” / not checked in — distinct from `waiter` (clock). */
  checkedInNo: MotorbikeIcon,
  dyno: Gauge,
  vacation: Palmtree,
  waiter: Clock,
  reminder: Pointer,
} as const satisfies Record<string, LucideIcon>;

export type AppointmentFieldIconKey = keyof typeof appointmentFieldIcons;
