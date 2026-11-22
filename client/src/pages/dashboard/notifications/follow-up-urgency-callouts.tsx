import type { FollowUpUrgency } from '@/utils/booking-request-follow-up';

type FollowUpUrgencyCalloutsProps = {
  followUrg: FollowUpUrgency;
};

export function FollowUpUrgencyCallouts({ followUrg }: FollowUpUrgencyCalloutsProps) {
  return (
    <>
      {followUrg === 'overdue' && (
        <div
          className="rounded-md border border-amber-600/50 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-950 dark:text-amber-100"
          role="status"
        >
          Follow-up date has passed. Consider a callback or update the date.
        </div>
      )}
      {followUrg === 'today' && (
        <div
          className="rounded-md border border-orange-500/50 bg-orange-500/10 px-2 py-1.5 text-xs text-orange-950 dark:text-orange-100"
          role="status"
        >
          Follow-up is due today — a good time to check in.
        </div>
      )}
    </>
  );
}
