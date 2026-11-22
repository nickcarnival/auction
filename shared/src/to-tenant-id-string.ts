/**
 * Hex string for API / JSON from a Mongo `ObjectId`, plain string, or other primitive.
 * Duck-types `toHexString` so shared does not depend on the `mongodb` package.
 */
export function toTenantIdString(tenantId: unknown): string {
  if (tenantId != null && typeof tenantId === 'object' && 'toHexString' in tenantId) {
    const hex = (tenantId as { toHexString: () => unknown }).toHexString();
    return typeof hex === 'string' ? hex : String(tenantId);
  }
  return String(tenantId ?? '');
}
