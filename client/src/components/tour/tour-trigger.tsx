import { useEffect } from 'react';
import { useTour } from '@/contexts/tour-context';

export const TourTrigger = () => {
  const { startTour, hasCompletedTour } = useTour();

  useEffect(() => {
    // Check if we should trigger the tour for new users
    const shouldTriggerTour = localStorage.getItem('trigger-tour') === 'true';

    if (shouldTriggerTour && !hasCompletedTour) {
      // Small delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        startTour();
        localStorage.removeItem('trigger-tour'); // Clean up flag
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [startTour, hasCompletedTour]);

  // This is a logic-only component, no UI
  return null;
};
