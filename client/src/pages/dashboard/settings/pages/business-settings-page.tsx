import { Suspense } from 'react';
import { GenericFallback } from '@/components/generic-fallback';
import { SettingsPageLayout } from '../components/settings-page-layout';
import { BookingPageTab } from '../tabs/booking-page-tab';

export default function BusinessSettingsPage() {
  return (
    <SettingsPageLayout>
      <Suspense fallback={<GenericFallback />}>
        <BookingPageTab />
      </Suspense>
    </SettingsPageLayout>
  );
}
