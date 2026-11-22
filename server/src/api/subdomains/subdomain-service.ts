import { getDb } from '@/db';
import type { ObjectId } from 'mongodb';
import type { SubdomainConfig } from '@shared/subdomain';
import { toTenantIdString } from '@shared/to-tenant-id-string';

const COLLECTION = 'subdomain-config';

export const getSubdomainByCode = async (code: string): Promise<SubdomainConfig | null> => {
  const db = await getDb();
  const collection = db.collection('subdomain-config');

  const doc = await collection
    .aggregate([
      {
        $match: { tenantCode: code }, // Match the subdomain-config document by tenantCode
      },
      {
        $lookup: {
          from: 'tenant', // The collection to join with
          localField: 'tenantId', // Match tenantId in subdomain-config
          foreignField: '_id', // Match _id in tenant
          as: 'tenant', // Store the result in a new field named 'tenant'
        },
      },
      {
        $unwind: { path: '$tenant', preserveNullAndEmptyArrays: true }, // Unwind the tenant array
      },
      {
        $project: {
          _id: 1,
          tenantId: 1,
          tenantCode: 1,
          redirectUrl: 1,
          backgroundColor: 1,
          created: 1,
          updated: 1,
          tenant: 1, // Include the full tenant object
        },
      },
    ])
    .toArray();

  const result = doc[0];

  if (!result?._id) {
    return null;
  }

  return {
    ...result,
    _id: toTenantIdString(result._id),
    tenantId: toTenantIdString(result.tenantId),
    tenant: result.tenant
      ? {
          ...result.tenant,
          _id: toTenantIdString(result.tenant._id),
        }
      : null,
  } as unknown as SubdomainConfig;
};

export const createSubdomainConfig = async (config: SubdomainConfig): Promise<ObjectId> => {
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  const result = await collection.insertOne({
    ...config,
    createdDate: new Date().toLocaleDateString(),
    _id: undefined,
  });

  return result.insertedId;
};
