import { forwardRef } from 'react';
import type { SVGProps } from 'react';

export type MotorbikeIconProps = SVGProps<SVGSVGElement>;

/**
 * Vendored from Lucide’s `motorbike` icon (<https://lucide.dev/icons/motorbike>, added upstream in v0.545.0).
 * Local copy keeps “need bike” / not-checked-in readable without pinning a newer `lucide-react` baseline.
 */
export const MotorbikeIcon = forwardRef<SVGSVGElement, MotorbikeIconProps>(function MotorbikeIcon(
  { width = 24, height = 24, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m18 14-1-3" />
      <path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81" />
      <path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5" />
      <circle cx="19" cy="17" r="3" />
      <circle cx="5" cy="17" r="3" />
    </svg>
  );
});

MotorbikeIcon.displayName = 'MotorbikeIcon';
