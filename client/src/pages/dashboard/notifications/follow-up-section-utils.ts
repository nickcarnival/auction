import moment from 'moment';

export const FOLLOW_UP_NOTE_MAX_LENGTH = 2000;

export function localDayKey(d: Date | null): number | null {
  if (!d) {
    return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function serverDayKey(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const m = moment(iso);
  if (!m.isValid()) {
    return null;
  }
  return localDayKey(m.toDate());
}
