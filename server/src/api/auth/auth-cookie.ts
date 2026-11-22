import type { Response } from 'express';

const AUTH_COOKIE = 'auth-token';
/** Client and API on different sites in production → `Secure` + `SameSite=None`. Local dev often cross-port → keep lax + insecure. */
const msSevenDays = 1000 * 60 * 60 * 24 * 7;

export function setAuthCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    maxAge: msSevenDays,
  });
}

export function clearAuthCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
  });
}
