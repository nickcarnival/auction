import { MapPinned, Phone } from 'lucide-react';
import { CSSProperties, ReactNode, useState } from 'react';
import { useSubdomainContext } from '../subdomain-provider';
import { getTenantDisplayTitle } from '@shared/tenant';
import { cn } from '@/lib/utils';
import { BookingPopoverPortalContainerContext } from '../booking-popover-portal-context';

const neon = {
  void: '#050508',
  panel: '#0c1018',
  grid: '#0f1624',
  cyan: '#22d3ee',
  cyanDim: 'rgba(34, 211, 238, 0.45)',
  magenta: '#e879f9',
  magentaDim: 'rgba(232, 121, 249, 0.35)',
  ink: '#e0f7fa',
  inkMuted: '#94a8b8',
} as const;

/** Dark cyber surfaces so `bg-background` / `border-input` inputs aren’t cream-on-cream with inherited body ink. */
const shellVars = {
  '--background': '210 44% 7%',
  '--foreground': '186 52% 94%',
  '--card': '210 40% 9%',
  '--card-foreground': '186 52% 94%',
  '--primary': '187 85% 53%',
  '--primary-foreground': '195 100% 6%',
  '--secondary': '210 28% 14%',
  '--secondary-foreground': '186 40% 90%',
  '--muted': '210 30% 12%',
  '--muted-foreground': '200 16% 58%',
  '--border': '190 28% 20%',
  '--input': '190 28% 20%',
  '--popover': '210 40% 8%',
  '--popover-foreground': '187 40% 92%',
  '--ring': '187 85% 53%',
  /** Avoid global warm `--accent` (beige); calendar “today” / range uses accent. */
  '--accent': '195 40% 16%',
  '--accent-foreground': '186 55% 92%',
} as unknown as CSSProperties;

const formScope = cn(
  '[&_form_input]:!text-cyan-50',
  '[&_form_input]:placeholder:!text-cyan-700/80',
  '[&_form_textarea]:!text-cyan-50',
  '[&_form_textarea]:placeholder:!text-cyan-700/80',
  '[&_form_label]:!text-cyan-300',
  '[&_form_.text-muted-foreground]:!text-cyan-600/90',
  '[&_form_p.text-destructive]:!text-fuchsia-400'
);

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const [bookingPortalRoot, setBookingPortalRoot] = useState<HTMLElement | null>(null);
  const { subdomainContext, subDomain } = useSubdomainContext();
  const title = getTenantDisplayTitle(
    subdomainContext?.tenant,
    subdomainContext?.tenantCode,
    subDomain
  );

  return (
    <div
      className={cn(
        'flex min-h-dvh w-full flex-col',
        'font-mono text-[15px] antialiased md:text-base'
      )}
      style={{
        backgroundColor: neon.void,
        color: neon.ink,
        ...shellVars,
      }}
    >
      {/* Subtle grid + vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(${neon.cyanDim} 1px, transparent 1px),
            linear-gradient(90deg, ${neon.cyanDim} 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <header
        className="relative z-[1] w-full shrink-0 border-b-2 px-4 py-4 md:px-6"
        style={{
          borderColor: neon.cyanDim,
          background: `linear-gradient(180deg, ${neon.panel} 0%, ${neon.grid} 100%)`,
          boxShadow: `0 0 24px ${neon.cyanDim}, inset 0 -1px 0 ${neon.magentaDim}`,
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.35em] md:text-xs"
              style={{ color: neon.magenta }}
            >
              // admin_test
            </p>
            <h1
              className="mt-1 text-lg font-bold uppercase tracking-wide md:text-2xl"
              style={{
                color: neon.cyan,
                textShadow: `0 0 18px ${neon.cyanDim}`,
              }}
            >
              {title}
            </h1>
          </div>

          <div
            className="flex flex-col gap-2 text-sm md:items-end md:text-right"
            style={{ color: neon.inkMuted }}
          >
            <div className="flex items-center gap-2 md:justify-end">
              <MapPinned className="size-4 shrink-0" style={{ color: neon.cyan }} aria-hidden />
              <span className="font-bold uppercase tracking-wider" style={{ color: neon.ink }}>
                1234 NEUROMAP ST
              </span>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 border px-3 py-1.5 text-left uppercase tracking-wider transition-colors hover:bg-cyan-500/10 md:ml-auto"
              style={{
                borderColor: neon.cyanDim,
                color: neon.cyan,
                boxShadow: `0 0 12px ${neon.cyanDim}`,
              }}
              aria-label="Call test line"
            >
              <Phone className="size-4 shrink-0" aria-hidden />
              123 · 123 · 1234
            </button>
          </div>
        </div>
      </header>

      <BookingPopoverPortalContainerContext.Provider value={bookingPortalRoot}>
        <main
          ref={setBookingPortalRoot}
          className={cn(
            'relative z-[1] min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-6 md:px-16 md:py-10',
            formScope
          )}
          style={{
            background: `linear-gradient(180deg, transparent 0%, ${neon.void} 40%)`,
          }}
        >
          {children}
        </main>
      </BookingPopoverPortalContainerContext.Provider>
    </div>
  );
};

export default AdminLayout;
