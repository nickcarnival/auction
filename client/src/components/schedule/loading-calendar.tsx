import { Skeleton } from '../ui/skeleton';

export const LoadingCalendar = () => {
  return (
    <div className="flex h-full w-full flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-1">
      <Skeleton className="w-full h-20" />

      <div className="w-full h-full flex gap-2">
        <Skeleton className="flex-grow h-full" />
        <div className="grow h-full flex flex-col items-center justify-evenly gap-4">
          <Skeleton className="w-full h-1/2" />
          <Skeleton className="w-full h-1/4" />
        </div>
        <Skeleton className="grow h-full" />
        <Skeleton className="grow h-full" />

        <div className="grow h-full flex flex-col items-center justify-around gap-4">
          <Skeleton className="w-full h-1/3" />
          <Skeleton className="w-full h-1/2" />
        </div>
        <Skeleton className="grow h-full" />
      </div>
    </div>
  );
};
