import type { Appointment } from '@shared/appointment';
import moment from 'moment';

export type DayBucketDetail = {
  date: moment.Moment;
  appointments: Appointment[];
};

export function bucketScheduledByDayDetailed(
  appointments: Appointment[],
  rangeStart: moment.Moment,
  dayCount: number
): DayBucketDetail[] {
  const buckets: DayBucketDetail[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const d = rangeStart.clone().add(i, 'days').startOf('day');
    buckets.push({ date: d, appointments: [] });
  }
  const dayKey = (m: moment.Moment) => m.format('YYYY-MM-DD');
  const indexByKey = new Map(buckets.map((b, i) => [dayKey(b.date), i]));
  for (const a of appointments) {
    if (!a.start) continue;
    const s = moment(a.start);
    if (!s.isValid()) continue;
    const k = dayKey(s.clone().startOf('day'));
    const idx = indexByKey.get(k);
    if (idx !== undefined) {
      buckets[idx].appointments.push(a);
    }
  }
  for (const b of buckets) {
    b.appointments.sort((x, y) => {
      const ax = x.start ? moment(x.start).valueOf() : 0;
      const ay = y.start ? moment(y.start).valueOf() : 0;
      return ax - ay;
    });
  }
  return buckets;
}

export type WeekBucketDetail = {
  weekStart: moment.Moment;
  appointments: Appointment[];
};

export function bucketScheduledByWeekDetailed(
  appointments: Appointment[],
  firstWeekStart: moment.Moment,
  numWeeks: number
): WeekBucketDetail[] {
  const buckets: WeekBucketDetail[] = [];
  const anchor = firstWeekStart.clone().startOf('week').startOf('day');
  const dayKey = (m: moment.Moment) => m.format('YYYY-MM-DD');
  for (let w = 0; w < numWeeks; w += 1) {
    const ws = anchor.clone().add(w, 'weeks');
    buckets.push({ weekStart: ws, appointments: [] });
  }
  const idxByWeekStart = new Map(buckets.map((b, i) => [dayKey(b.weekStart), i]));
  for (const a of appointments) {
    if (!a.start) continue;
    const s = moment(a.start);
    if (!s.isValid()) continue;
    const weekStart = s.clone().startOf('week').startOf('day');
    const idx = idxByWeekStart.get(dayKey(weekStart));
    if (idx !== undefined) {
      buckets[idx].appointments.push(a);
    }
  }
  for (const b of buckets) {
    b.appointments.sort((x, y) => {
      const ax = x.start ? moment(x.start).valueOf() : 0;
      const ay = y.start ? moment(y.start).valueOf() : 0;
      return ax - ay;
    });
  }
  return buckets;
}
