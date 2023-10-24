import 'reflect-metadata';
import {initLogger} from './logger';
import {container as app} from 'tsyringe';
import {EventEmitter} from 'events';
import {createMongoClient} from './infrastructure/database/mongo/createMongoClient';
import {MongoClient} from 'mongodb';
import {WSClientConfigurableOptions, WebsocketClient} from 'bybit-api';

const logger = initLogger(__filename);

const logger2 = {
  silly: (...params: any) => {},
  debug: (...params: any) => {},
  notice: (...params: any) => {},
  info: (...params: any) => {},
  warning: (...params: any) => {},
  error: (...params: any) => {},
};

export async function bootstrapDependencies() {
  const mongoClient = await createMongoClient();
  const eventEmitter = new EventEmitter();

  app.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  app.register<MongoClient>('MongoClient', {useValue: mongoClient});
}

async function main() {
  logger.info('bootstrap app dependencies');
  await bootstrapDependencies();
  const wsOptions: WSClientConfigurableOptions = {
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    testnet: true,
    market: 'v5',
  };
  console.log(wsOptions);
  const ws = new WebsocketClient(wsOptions, logger);

  ws.subscribeV5(['kline.1.BTCUSDT'], 'linear').catch(err => console.log(err));

  // ws.subscribe('kline.BTCUSD.1m').catch(err => console.log(err));

  // ws.subscribeV5('position', 'linear').catch(err => console.log(err));

  ws.on('update', data => {
    console.log('update', data);
  });

  // Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
  ws.on('open', ({wsKey, event}) => {
    console.log('connection open for websocket with ID: ' + wsKey);
  });

  // Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
  ws.on('response', response => {
    console.log('response', response);
  });

  // Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
  ws.on('close', () => {
    console.log('connection closed');
  });

  // Optional: Listen to raw error events. Recommended.
  ws.on('error', err => {
    console.error('error', err);
  });
}

main().catch(err => console.log(err));
