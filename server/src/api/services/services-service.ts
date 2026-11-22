import { getDb } from '@/db';

const COLLECTION = 'services';

export const conditionalCreateService = async (serviceName?: string) => {
  if (!serviceName) return;
  const db = await getDb();
  const collection = db.collection(COLLECTION);

  return collection.updateOne(
    { name: serviceName },
    {
      $set: {
        name: serviceName,
        updatedDate: new Date().toLocaleDateString(),
      },
    },
    { upsert: true }
  );
};
