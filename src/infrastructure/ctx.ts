import 'reflect-metadata';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
import {createMongoClient} from './database/mongo/createMongoClient';
import {MongoClient} from 'mongodb';
import {
  WSClientConfigurableOptions,
  WebsocketClient,
  RestClientV5,
} from 'bybit-api';

export async function bootstrapCtx() {
  const mongoClient = await createMongoClient();
  const eventEmitter = new EventEmitter();

  const wsOptions: WSClientConfigurableOptions = {
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: true,
    market: 'v5',
  };

  const bybitWs = new WebsocketClient(wsOptions);

  const bybitClient = new RestClientV5({
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: true,
  });

  container.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  container.register<MongoClient>('MongoClient', {useValue: mongoClient});
  container.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  container.register<RestClientV5>('RestClientV5', {useValue: bybitClient});

  eventEmitter.on('EVENT', () => console.log());

  eventEmitter.on('SUBMIT_ORDER', () => {
    eventEmitter.emit('EVENT');
  });
}
