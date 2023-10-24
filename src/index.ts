import 'reflect-metadata';
import {initLogger} from './logger';
import {container as app} from 'tsyringe';
import {EventEmitter} from 'events';
import {createMongoClient} from './infrastructure/database/mongo/createMongoClient';
import {MongoClient} from 'mongodb';

const logger = initLogger(__filename);

export async function bootstrapDependencies() {
  const mongoClient = await createMongoClient();
  const eventEmitter = new EventEmitter();

  app.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  app.register<MongoClient>('MongoClient', {useValue: mongoClient});
}

async function main() {
  logger.info('bootstrap app dependencies');
  await bootstrapDependencies();
}

main().catch(err => console.log(err));
