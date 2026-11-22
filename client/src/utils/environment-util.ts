// API base, SPA origin, and cookie domain for the browser bundle (Vite replaces `process.env.NODE_ENV`).
export const BASE_URL = ((): string => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.plandry.org';
  }
  return 'http://localhost:3000';
})();

export const HOME_URL = ((): string => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.plandry.org';
  }
  return 'http://localhost:5173';
})();

export const COOKIE_DOMAIN = ((): string => {
  if (process.env.NODE_ENV === 'production') {
    return 'plandry.org';
  }
  return 'localhost';
})();
