import { ObjectId } from 'mongodb';

/**
 * Matches documents whose `tenantId` is stored as ObjectId or legacy string hex.
 */
export function tenantIdMatchClause(
  tenantIdHex: string
): { $or: Array<{ tenantId: ObjectId } | { tenantId: string }> } {
  if (!tenantIdHex.trim().length || !ObjectId.isValid(tenantIdHex)) {
    throw new Error('invalid_tenant_id');
  }
  const oid = new ObjectId(tenantIdHex);
  return { $or: [{ tenantId: oid }, { tenantId: tenantIdHex }] };
}
