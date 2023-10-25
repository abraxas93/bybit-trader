import 'reflect-metadata';
import {container as app} from 'tsyringe';
import {EventEmitter} from 'events';
import {createMongoClient} from './infrastructure/database/mongo/createMongoClient';
import {MongoClient} from 'mongodb';
import {
  WSClientConfigurableOptions,
  WebsocketClient,
  RestClientV5,
} from 'bybit-api';

export async function bootstrapApp() {
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

  app.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  app.register<MongoClient>('MongoClient', {useValue: mongoClient});
  app.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  app.register<RestClientV5>('RestClientV5', {useValue: bybitClient});

  return app;
}
