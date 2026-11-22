import { createContext } from 'react';

/**
 * When set (e.g. Maurer booking shell), date-picker popovers portal here so they inherit local
 * `--primary` / `--popover` theme instead of the global document palette.
 */
export const BookingPopoverPortalContainerContext = createContext<HTMLElement | null>(null);
