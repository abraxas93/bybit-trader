// ... other imports ...
import {MongoClient} from 'mongodb';
import {MONGO_URL, MONGO_USER, MONGO_PASSWORD} from '../../../config';

export interface IMongoClient {
  client: MongoClient;
}

export async function createMongoClient(): Promise<MongoClient> {
  const url = MONGO_URL;
  const user = MONGO_USER;
  const password = MONGO_PASSWORD;

  if (!url) throw new Error(`ENV_VAR: mongodb url is ${url}`);

  const client = await MongoClient.connect(url, {
    auth: {username: user, password},
  });

  return client;
}
