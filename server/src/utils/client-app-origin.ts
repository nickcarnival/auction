/**
 * Browser origin for transactional links (invite, password reset) and Stripe return URLs.
 *
 * - Override with **`CLIENT_APP_ORIGIN`** on the API server when needed (e.g. staging).
 * - Otherwise matches client **`HOME_URL`** in `client/src/utils/environment-util.ts`: production →
 *   `https://www.plandry.org`, dev → `http://localhost:5173`.
 */
const DEFAULT_PRODUCTION_CLIENT_ORIGIN = 'https://www.plandry.org';
const DEFAULT_DEV_CLIENT_ORIGIN = 'http://localhost:5173';

export function getClientAppOrigin(): string {
  const explicit = process.env.CLIENT_APP_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PRODUCTION_CLIENT_ORIGIN;
  }
  return DEFAULT_DEV_CLIENT_ORIGIN;
}
