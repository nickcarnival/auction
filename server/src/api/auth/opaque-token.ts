import { createHash, randomBytes } from 'crypto';

/** URL-safe opaque string; only ever sent to the user (email/link). Never store raw in the DB. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Deterministic hash for looking up a token server-side (invite, password reset). */
export function hashOpaqueToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}
