import { Button } from '@/components/ui/button';
import { GenericDateField } from '@/components/booking/generic-date-field';
import { Textarea } from '@/components/ui/textarea';
import { useNotificationContext } from '@/hooks/notification-context';
import type { BookingRequest } from '@shared/booking';
import { getFollowUpUrgency } from '@/utils/booking-request-follow-up';
import { isBefore, startOfDay } from 'date-fns';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FollowUpUrgencyCallouts } from './follow-up-urgency-callouts';
import {
  FOLLOW_UP_NOTE_MAX_LENGTH,
  localDayKey,
  serverDayKey,
} from './follow-up-section-utils';

interface RequestFollowUpSectionProps {
  notification: BookingRequest;
}

export function RequestFollowUpSection({ notification }: RequestFollowUpSectionProps) {
  const { updateFollowUpMutation, requestQueue } = useNotificationContext();
  const followUrg = getFollowUpUrgency(notification, requestQueue);
  const serverNote = notification.followUpNote ?? '';
  const [draftDate, setDraftDate] = useState<Date | null>(() =>
    notification.followUpAt ? new Date(notification.followUpAt) : null
  );
  const [draftNote, setDraftNote] = useState(() => serverNote);

  useEffect(() => {
    setDraftDate(notification.followUpAt ? new Date(notification.followUpAt) : null);
  }, [notification._id, notification.followUpAt]);

  useEffect(() => {
    setDraftNote(notification.followUpNote ?? '');
  }, [notification._id, notification.followUpNote]);

  const serverDay = useMemo(() => serverDayKey(notification.followUpAt), [notification.followUpAt]);
  const draftDay = localDayKey(draftDate);
  const isDirty = serverDay !== draftDay;
  const isNoteDirty = draftNote !== serverNote;
  const sectionDirty = isDirty || isNoteDirty;

  const readAtLabel = notification.readAt
    ? moment(notification.readAt).format('MMM D, YYYY h:mm A')
    : '—';

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div>
        <span className="text-sm font-medium text-foreground">Follow up</span>
        <p className="text-xs text-muted-foreground">
          Reminder for this request. Cleared when a linked appointment is confirmed or the request is
          rejected.
        </p>
      </div>
      <FollowUpUrgencyCallouts followUrg={followUrg} />
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Follow-up note (staff only)</div>
        <Textarea
          value={draftNote}
          onChange={e => setDraftNote(e.target.value)}
          placeholder="e.g. left VM, text back Friday, waiting on parts quote…"
          maxLength={FOLLOW_UP_NOTE_MAX_LENGTH}
          className="min-h-[72px] text-sm"
          aria-label="Follow-up note"
        />
        <div className="text-xs text-muted-foreground">
          {draftNote.length}/{FOLLOW_UP_NOTE_MAX_LENGTH} characters
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-[14rem]">
          <div className="mb-1 text-xs text-muted-foreground">Date</div>
          <GenericDateField
            allowEmpty
            hideWeekends={false}
            disablePastDates
            initialDate={draftDate ?? undefined}
            onDateChange={setDraftDate}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!sectionDirty || updateFollowUpMutation.isPending}
          onClick={() => {
            if (
              draftDate != null &&
              isBefore(startOfDay(draftDate), startOfDay(new Date()))
            ) {
              toast.error('Follow-up date cannot be in the past.');
              return;
            }
            const next = draftDate ? startOfDay(draftDate).toISOString() : null;
            const trimmed = draftNote.trim();
            updateFollowUpMutation.mutate(
              {
                id: notification._id,
                followUpAt: next,
                followUpNote: trimmed === '' ? null : trimmed,
              },
              {
                onSuccess: () => toast.success('Follow-up saved'),
                onError: err =>
                  toast.error(err instanceof Error ? err.message : 'Could not save follow-up'),
              }
            );
          }}
        >
          {updateFollowUpMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={
            updateFollowUpMutation.isPending || (!notification.followUpAt && draftDate == null)
          }
          onClick={() => {
            setDraftDate(null);
            updateFollowUpMutation.mutate(
              { id: notification._id, followUpAt: null },
              {
                onSuccess: () => toast.success('Follow-up cleared'),
                onError: err =>
                  toast.error(err instanceof Error ? err.message : 'Could not clear follow-up'),
              }
            );
          }}
        >
          Clear
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="text-muted-foreground/80">First opened</span>{' '}
        <span className="text-foreground">{readAtLabel}</span>
      </div>
    </div>
  );
}
