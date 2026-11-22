import { MongoClient } from 'mongodb';
import { getEnv } from './utils/get-env';

let client: MongoClient | null = null;
let isConnected = false;

export async function getDb() {
  const { DB_URL } = getEnv();

  if (!client || !isConnected) {
    client = new MongoClient(DB_URL);
    await client.connect();
    isConnected = true; // Ensure the client is connected
  }
  return client.db('booking'); // Reuse the connected client
}

export async function closeDb() {
  if (client) {
    await client.close();
    isConnected = false;
  }
}
