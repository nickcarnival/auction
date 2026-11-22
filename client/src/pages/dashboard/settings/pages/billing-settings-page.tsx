import { SettingsPageLayout } from '../components/settings-page-layout';
import BillingPage from '@/pages/dashboard/billing-page';

export default function BillingSettingsPage() {
  return (
    <SettingsPageLayout>
      <BillingPage />
    </SettingsPageLayout>
  );
}
