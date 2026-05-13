import { MongoClient } from 'mongodb';

declare global {
  var __gardenMongoClientPromise__: Promise<MongoClient> | undefined;
}

export const CUSTOM_MONGO_DB_NAME = 'test';

export async function getCustomMongoDb() {
  const url = process.env.MONGO_URL;
  if (!url) {
    throw new Error('MONGO_URL is missing.');
  }

  if (!globalThis.__gardenMongoClientPromise__) {
    const client = new MongoClient(url);
    globalThis.__gardenMongoClientPromise__ = client.connect();
  }

  return (await globalThis.__gardenMongoClientPromise__).db(CUSTOM_MONGO_DB_NAME);
}
