import moment from 'moment';
import type { Appointment } from '@shared/appointment';
import { FORMAT } from '@shared/date-utils';

type InputType = string | undefined | Date;

function roundTo30MinBucket(dateString: InputType): moment.Moment {
  const time = moment(dateString);

  if (time.minute() % 30 === 0) {
    return time;
  }

  const remainder = 30 - (time.minute() % 30);

  const rounded = moment(time).add(remainder, 'minutes');

  return rounded;
}

export function convertStartEnd(appointment: Appointment): Appointment {
  const start = roundTo30MinBucket(appointment.start);

  const end = moment(appointment.end);

  if (end.isBefore(start)) {
    end.set({
      hour: start.hour(),
      minute: start.minute(),
      date: start.date(),
      month: start.month(),
      year: start.year(),
    });
  }

  return {
    ...appointment,
    duration: (!appointment.duration || appointment.duration < 0.5
      ? 0.5
      : appointment.duration) as number,
    start: start.format(FORMAT),
    end: end.format(FORMAT),
  };
}
