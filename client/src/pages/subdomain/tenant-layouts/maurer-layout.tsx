import { MapPinned, Phone } from 'lucide-react';
import { CSSProperties, ReactNode, useState } from 'react';
import { useSubdomainContext } from '../subdomain-provider';
import { getTenantDisplayTitle } from '@shared/tenant';
import { cn } from '@/lib/utils';
import { BookingPopoverPortalContainerContext } from '../booking-popover-portal-context';

/** Harley-Davidson-style orange (hex for inline `style` only). */
const HARLEY_ORANGE = '#FF6600';

/** Shadcn tokens use `hsl(var(--name))`; keeps calendar popover on Harley orange + white (no global brown). */
const maurerCalendarTheme = {
  '--primary': '24 100% 50%',
  '--primary-foreground': '0 0% 100%',
  '--primary-deep': '20 95% 42%',
  '--accent': '24 45% 94%',
  '--accent-foreground': '0 0% 9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 9%',
  '--border': '0 0% 82%',
  '--input': '0 0% 82%',
  '--ring': '24 100% 50%',
  '--muted': '0 0% 96%',
  '--muted-foreground': '0 0% 42%',
  '--foreground': '0 0% 9%',
  '--background': '0 0% 100%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 9%',
} as unknown as CSSProperties;

const MaurersLayout = ({ children }: { children: ReactNode }) => {
  const [bookingPortalRoot, setBookingPortalRoot] = useState<HTMLDivElement | null>(null);
  const { subdomainContext, subDomain } = useSubdomainContext();
  const pageTitle = getTenantDisplayTitle(
    subdomainContext?.tenant,
    subdomainContext?.tenantCode,
    subDomain
  );

  /**
   * Booking `<form>` only — date picker portals into this same div; `[&_button]` would steal
   * calendar day styles (`day_selected` / `bg-primary`) with `!important`.
   */
  const formScope = cn(
    '[&_form_input]:!border-zinc-300 [&_form_input]:!bg-white [&_form_input]:!text-black',
    '[&_form_input]:placeholder:!text-zinc-500',
    '[&_form_input]:focus-visible:!border-zinc-400 [&_form_input]:focus-visible:!ring-2 [&_form_input]:focus-visible:!ring-[#FF6600] [&_form_input]:focus-visible:!ring-offset-0',
    '[&_form_textarea]:!border-zinc-300 [&_form_textarea]:!bg-white [&_form_textarea]:!text-black',
    '[&_form_textarea]:placeholder:!text-zinc-500',
    '[&_form_textarea]:focus-visible:!ring-2 [&_form_textarea]:focus-visible:!ring-[#FF6600] [&_form_textarea]:focus-visible:!ring-offset-0',
    "[&_form_button:not([type='submit'])]:!border-[#FF6600] [&_form_button:not([type='submit'])]:!bg-white [&_form_button:not([type='submit'])]:!text-black",
    "[&_form_button:not([type='submit'])]:hover:!bg-zinc-50 [&_form_button:not([type='submit'])]:hover:!border-[#ea580c]",
    "[&_form_button[type='submit']]:!bg-[#FF6600] [&_form_button[type='submit']]:!text-white",
    "[&_form_button[type='submit']]:hover:!bg-[#ea580c] [&_form_button[type='submit']]:hover:!text-white",
    '[&_form_button[type=submit]]:font-semibold [&_form_button[type=submit]]:shadow-md',
    '[&_form_button]:rounded-sm [&_form_input]:rounded-sm [&_form_textarea]:rounded-sm',
    '[&_form_label]:!text-[#FF6600] [&_form_p.text-destructive]:!text-red-600',
    '[&_form_.text-muted-foreground]:!text-zinc-500'
  );

  return (
    <div className="flex min-h-dvh w-full flex-col bg-black font-merriweather">
      <div className="w-full shrink-0 flex justify-center bg-[url('/images/maurersbackground.jpg')] bg-cover bg-center bg-no-repeat p-2">
        <img className="w-32 md:w-96" src="images/main_logo.png" alt="Maurer's Motors Logo" />

        <div
          className="hidden grow flex-col items-start justify-center pl-[25%] text-xl md:flex md:w-full"
          style={{ color: HARLEY_ORANGE }}
        >
          <div
            className="flex items-center gap-1 font-bold"
            aria-description="Maurer's Motors Address"
          >
            <MapPinned />

            <span>2235 S Kalamath St, Denver, CO 80223</span>
          </div>

          <button
            type="button"
            aria-description="Call Maurer's Motors"
            className="flex items-center cursor-pointer gap-1"
            onClick={() => window.open('tel:3039166663')}
          >
            <Phone />
            (303)-916-6663
          </button>
        </div>
      </div>

      <BookingPopoverPortalContainerContext.Provider value={bookingPortalRoot}>
        <div
          ref={setBookingPortalRoot}
          className={cn(
            'w-full flex-1 overflow-x-hidden bg-black pb-6 text-white md:px-24',
            formScope
          )}
          style={maurerCalendarTheme}
        >
          <h1
            className="px-2 pt-2 text-xl font-bold md:pt-4 md:text-2xl"
            style={{ color: HARLEY_ORANGE }}
          >
            {pageTitle}
          </h1>
          {children}
        </div>
      </BookingPopoverPortalContainerContext.Provider>
    </div>
  );
};

export default MaurersLayout;
