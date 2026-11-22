import { createPortal } from 'react-dom';
import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

export type SpotlightHole = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

interface AppointmentFocusSpotlightProps {
  hole: SpotlightHole | null;
  /** Drive opacity for fade-in / fade-out */
  visible: boolean;
}

/** Resolve `--radius-calendar-work-week` to px for SVG `rx` / `ry` (CSS vars are unreliable on SVG rects in some engines). */
function spotlightCornerRadiusPx(): number {
  if (typeof document === 'undefined') return 6;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--radius-calendar-work-week')
    .trim();
  if (!raw) return 6;
  if (raw.endsWith('rem')) {
    const rem = parseFloat(raw);
    if (!Number.isFinite(rem)) return 6;
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * rootPx;
  }
  if (raw.endsWith('px')) {
    const px = parseFloat(raw);
    return Number.isFinite(px) ? px : 6;
  }
  return 6;
}

/**
 * Product-tour style overlay: full-viewport dimmer with a **rounded-rect hole** cut via SVG mask
 * (clean inner corners, no box-shadow tricks). Optional stroke traces the hole like Joyride/Driver.
 */
export function AppointmentFocusSpotlight({ hole, visible }: AppointmentFocusSpotlightProps) {
  const reactId = useId();
  const maskId = useMemo(() => `schedule-spotlight-mask-${reactId.replace(/[^a-zA-Z0-9_-]/g, '_')}`, [reactId]);

  const rx = useMemo(() => {
    if (!hole) return 6;
    return spotlightCornerRadiusPx();
  }, [hole]);

  if (!hole || typeof document === 'undefined') {
    return null;
  }

  const { top, left, right, bottom } = hole;
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-40 transition-opacity duration-500 ease-out',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      aria-hidden
    >
      <svg
        className="schedule-focus-spotlayer absolute inset-0 h-full w-full"
        width={vw}
        height={vh}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={rx}
              ry={rx}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vw}
          height={vh}
          fill="hsl(var(--foreground) / 0.5)"
          mask={`url(#${maskId})`}
        />
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          rx={rx}
          ry={rx}
          fill="none"
          stroke="hsl(var(--background) / 0.85)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>,
    document.body
  );
}
