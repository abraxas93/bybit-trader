import 'reflect-metadata';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
// import {createMongoClient} from './database/mongo/createMongoClient';
// import {MongoClient} from 'mongodb';
import {
  WSClientConfigurableOptions,
  WebsocketClient,
  RestClientV5,
} from 'bybit-api';
import {Store} from '../domain/entities/Store';
import {SYMBOL} from '../config';
import {
  SubmitAvgOrder,
  SubmitOpenOrder,
  SubmitProfitOrder,
} from '../application';
import {WsTopicHandler} from './adapters/handlers/WsTopicHandler';
import {ProcessOrderData} from '../application/use-cases/ProcessOrderData';

export function bootstrapCtx() {
  // const mongoClient = await createMongoClient();
  const eventEmitter = new EventEmitter();

  const wsOptions: WSClientConfigurableOptions = {
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: process.env.NODE_ENV === 'testnet' ? true : false,
    market: 'v5',
  };

  const bybitWs = new WebsocketClient(wsOptions);

  const bybitClient = new RestClientV5({
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: process.env.NODE_ENV === 'testnet' ? true : false,
  });

  container.register<Store>('Store', {
    useValue: new Store(SYMBOL, eventEmitter),
  });

  container.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  container.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  container.register<RestClientV5>('RestClientV5', {useValue: bybitClient});

  container.register<ProcessOrderData>('ProcessOrderData', ProcessOrderData);

  container.register<WsTopicHandler>('WsTopicHandler', WsTopicHandler);

  container.register<SubmitOpenOrder>('SubmitOpenOrder', SubmitOpenOrder);
  container.register<SubmitProfitOrder>('SubmitProfitOrder', SubmitProfitOrder);
  container.register<SubmitAvgOrder>('SubmitAvgOrder', SubmitAvgOrder);
}
