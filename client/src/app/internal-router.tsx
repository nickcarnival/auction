import { Routes, Route, Outlet, Navigate } from 'react-router';
import { lazyRoute } from '@/lib/lazy-route';
import { TECHNICIANS_PATH } from '@/lib/technician-settings-url';
import { APP_ROLE } from '@shared/app-rbac';
import { PrivateRoute } from './private-route';
import { RoleRoute } from './role-route';

const DashboardLayout = lazyRoute(() => import('@/pages/dashboard/dashboard-layout'));
const SchedulePage = lazyRoute(() => import('@/pages/dashboard/schedule-page'));
const BusinessSettingsPage = lazyRoute(
  () => import('@/pages/dashboard/settings/pages/business-settings-page')
);
const TeamTechniciansSettingsPage = lazyRoute(
  () => import('@/pages/dashboard/settings/pages/team-technicians-settings-page')
);
const TeamWorkspaceLayout = lazyRoute(() => import('@/pages/dashboard/team-workspace-layout'));
const TechniciansOverviewPage = lazyRoute(() => import('@/pages/dashboard/technicians-overview-page'));
const TechnicianDetailPage = lazyRoute(() => import('@/pages/dashboard/technician-detail-page'));
const WorkspaceManagerPage = lazyRoute(() => import('@/pages/dashboard/technicians/workspace-manager-page'));
const OperationsSettingsPage = lazyRoute(
  () => import('@/pages/dashboard/settings/pages/operations-settings-page')
);
const NotificationsPage = lazyRoute(() => import('@/pages/dashboard/notifications/notifications-page'));
const CustomerPage = lazyRoute(() => import('@/pages/dashboard/customers-page'));
const CustomerDuplicatesPage = lazyRoute(
  () => import('@/pages/dashboard/customers/customer-duplicates-page')
);
const CustomerDetailsPage = lazyRoute(() => import('@/pages/dashboard/customers/customer-details-page'));
const CustomerMergePage = lazyRoute(() => import('@/pages/dashboard/customers/customer-merge-page'));
const CustomerManualMergePage = lazyRoute(
  () => import('@/pages/dashboard/customers/customer-manual-merge-page')
);
const MotorcyclesSettingsPage = lazyRoute(
  () => import('@/pages/dashboard/settings/pages/motorcycles-settings-page')
);
const BillingSettingsPage = lazyRoute(
  () => import('@/pages/dashboard/settings/pages/billing-settings-page')
);
const TrialExpiredPage = lazyRoute(() => import('@/pages/dashboard/trial-expired-page'));
const DataSettingsPage = lazyRoute(() => import('@/pages/dashboard/settings/pages/data-settings-page'));
const NotificationsSettingsPage = lazyRoute(
  () => import('@/pages/dashboard/settings/pages/notifications-settings-page')
);

const NotFoundPage = lazyRoute(() => import('@/pages/not-found-page'));
const LoginPage = lazyRoute(() => import('@/pages/auth/login-page'));
const SignupPage = lazyRoute(() => import('@/pages/auth/signup-page'));
const ForgotPasswordPage = lazyRoute(() => import('@/pages/auth/forgot-password-page'));
const ResetPasswordPage = lazyRoute(() => import('@/pages/auth/reset-password-page'));
const TenantPage = lazyRoute(() => import('@/pages/dashboard/tenant/tenant-page'));
const TenantDetailsPage = lazyRoute(() => import('@/pages/dashboard/tenant/tenant-details-page'));

import { MarketingHome } from '@/pages/landing/marketing-home';
import { MarketingLayout } from '@/pages/landing/marketing-layout';
import { FeedbackPage } from '@/pages/landing/feedback';
import { PrivacyPage } from '@/pages/landing/privacy-page';
import { TermsPage } from '@/pages/landing/terms-page';
import { ContactPage } from '@/pages/landing/contact-page';

const InternalRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MarketingLayout />}>
        <Route index element={<MarketingHome />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      <Route element={<Outlet />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Baseline workspace UI: member, tenant admin, and platform admin all satisfy `user`. */}
          <Route element={<RoleRoute minRole={APP_ROLE.USER}><Outlet /></RoleRoute>}>
          <Route path="trial-expired" element={<TrialExpiredPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route
            path="billing"
            element={<Navigate to="/dashboard/settings/billing" replace />}
          />
          <Route path="customers" element={<CustomerPage />} />
          <Route path="customers/duplicates" element={<CustomerDuplicatesPage />} />
          <Route path="customers/merge-selected" element={<CustomerManualMergePage />} />
          <Route path="customers/:customerId/merge" element={<CustomerMergePage />} />
          <Route path="customers/:customerId" element={<CustomerDetailsPage />} />
          <Route element={<TeamWorkspaceLayout />}>
            <Route path="technicians" element={<Outlet />}>
              <Route index element={<TechniciansOverviewPage />} />
              <Route
                path="managers/new"
                element={
                  <RoleRoute minRole={APP_ROLE.TENANT_ADMIN}>
                    <WorkspaceManagerPage />
                  </RoleRoute>
                }
              />
              <Route
                path="managers/:managerId"
                element={
                  <RoleRoute minRole={APP_ROLE.TENANT_ADMIN}>
                    <WorkspaceManagerPage />
                  </RoleRoute>
                }
              />
              <Route path="users" element={<Navigate to={TECHNICIANS_PATH} replace />} />
              <Route path=":technicianId" element={<TechnicianDetailPage />} />
            </Route>
            <Route
              path="settings"
              element={<Navigate to="/dashboard/settings/operations" replace />}
            />
            <Route path="settings/business" element={<BusinessSettingsPage />} />
            <Route
              path="settings/team/users"
              element={<Navigate to={TECHNICIANS_PATH} replace />}
            />
            <Route path="settings/team/technicians" element={<TeamTechniciansSettingsPage />} />
            <Route path="settings/operations" element={<OperationsSettingsPage />} />
            <Route path="settings/motorcycles" element={<MotorcyclesSettingsPage />} />
            <Route path="settings/data" element={<DataSettingsPage />} />
            <Route path="settings/billing" element={<BillingSettingsPage />} />
            <Route path="settings/notifications" element={<NotificationsSettingsPage />} />
          </Route>
          <Route path="requests" element={<NotificationsPage />} />
          <Route path="notifications" element={<Navigate to="/dashboard/requests" replace />} />

          <Route
            path="tenant"
            element={
              <RoleRoute minRole={APP_ROLE.ADMIN}>
                <TenantPage />
              </RoleRoute>
            }
          />
          <Route
            path="tenant/:id"
            element={
              <RoleRoute minRole={APP_ROLE.ADMIN}>
                <TenantDetailsPage />
              </RoleRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default InternalRouter;
