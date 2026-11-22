/** Normalizes `tenantId` from auth/API for URLs and React Query keys. */
export function normalizeTenantId(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof raw === 'object' && raw !== null && '$oid' in raw) {
    const oid = (raw as { $oid: unknown }).$oid;
    return typeof oid === 'string' && oid.length > 0 ? oid : undefined;
  }
  const s = String(raw);
  if (s === '[object Object]') return undefined;
  return s.length > 0 ? s : undefined;
}
