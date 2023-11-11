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
import {Store} from '../domain/entities/Store';
import {SYMBOL} from '../config';
import {SubmitOpenOrder} from '../application';
import {WsTopicHandler} from './adapters/handlers/WsTopicHandler';
import {SubmitOrder} from '../application/use-cases/SubmitOrder';

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

  container.register<Store>('Store', {
    useValue: new Store(SYMBOL, eventEmitter),
  });

  container.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  container.register<MongoClient>('MongoClient', {useValue: mongoClient});
  container.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  container.register<RestClientV5>('RestClientV5', {useValue: bybitClient});

  container.register<WsTopicHandler>('WsTopicHandler', WsTopicHandler);

  container.register<SubmitOpenOrder>('SubmitOpenOrder', SubmitOpenOrder);
  container.register<SubmitOrder>('SubmitOrder', SubmitOrder);
}
