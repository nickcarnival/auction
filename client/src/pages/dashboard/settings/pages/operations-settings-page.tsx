import { Suspense } from 'react';
import { GenericFallback } from '@/components/generic-fallback';
import { SettingsPageLayout } from '../components/settings-page-layout';
import { OperationsTab } from '../tabs/operations-tab';

export default function OperationsSettingsPage() {
  return (
    <SettingsPageLayout>
      <Suspense fallback={<GenericFallback />}>
        <OperationsTab />
      </Suspense>
    </SettingsPageLayout>
  );
}
