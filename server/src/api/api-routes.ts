import { Router } from 'express';
import appointments from './appointment/appointment-routes';
import resources from './resource-routes';
import services from './services/services-routes';
import auth from './auth/auth-routes';
import users from './user/user-routes';
import tenants from './tenant/tenant-routes';
import bookings from './booking/booking-routes';
import bookingRequests from './booking/booking-request-routes';
import subdomains from './subdomains/subdomain-routes';
import signup from './signup/signup-routes';
import { authenticateMiddleware } from '../middleware/auth-middleware';
import { requireBillingAccessMiddleware } from '../middleware/billing-access-middleware';
import customers from './customer/customer-routes';
import healthCheck from './health-check/health-check';
import stripeRoutes from './stripe/stripe-routes';
import holidays from './holiday/holiday-routes';
import exportRoutes from './export/export-routes';
import analyticsRoutes from './analytics/analytics-routes';
import { APP_ROLE } from '@shared/app-rbac';
import { requireAppRole } from '../middleware/require-app-role-middleware';

const router = Router();

/**
 * Baseline for workspace APIs: any signed-in workspace account (`user` tier in `@shared/app-rbac`).
 * Routes that need **tenant admin** or **platform admin** add `requireAppRole(APP_ROLE.TENANT_ADMIN)` or `(APP_ROLE.ADMIN)`
 * on the handler (or `router.use` inside that router). See `route-role-inventory.ts` for the list.
 */
const userScope = requireAppRole(APP_ROLE.USER);

// Public routes (no authentication required)
router.use('/health', healthCheck);
router.use('/auth', auth);
router.use('/subdomains', subdomains);
router.use('/booking-request', bookingRequests);
router.use('/signup', signup);

// Protected routes (authentication required)
router.use(authenticateMiddleware);
// Checkout / portal must work when subscription is not yet active (before billing gate)
router.use('/stripe', userScope, stripeRoutes);
router.use(requireBillingAccessMiddleware);
router.use('/export', userScope, exportRoutes);
router.use('/analytics', userScope, analyticsRoutes);

router.use('/bookings', userScope, bookings);
router.use('/appointments', userScope, appointments);
router.use('/resources', userScope, resources);
router.use('/services', userScope, services);
router.use('/users', userScope, users);
router.use('/tenants', userScope, tenants);
router.use('/holidays', userScope, holidays);
router.use('/customers', userScope, customers);

export default router;
