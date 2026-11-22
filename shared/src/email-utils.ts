/** Lowercase trimmed email for tenant-scoped customer dedupe. */
export function normalizeEmailForLookup(email: string | null | undefined): string | null {
  if (email == null || email === '') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
