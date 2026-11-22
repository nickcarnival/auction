import type { ComponentProps } from 'react';
import { Toaster as SonnerToaster } from 'sonner';

type ToasterProps = ComponentProps<typeof SonnerToaster>;

/** Default time before every toast auto-dismisses (override per call with `{ duration: ms }` if needed). */
export const TOAST_AUTO_DISMISS_MS = 2000;

/**
 * Global toast host. Import `toast` from `sonner` anywhere under `AppProviders`.
 */
export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-center"
      offset="1rem"
      richColors
      closeButton={false}
      toastOptions={{
        duration: TOAST_AUTO_DISMISS_MS,
        closeButton: false,
        classNames: {
          toast:
            'group border border-border bg-card text-card-foreground shadow-lg backdrop-blur-sm',
          title: 'font-semibold text-foreground',
          description: 'text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
