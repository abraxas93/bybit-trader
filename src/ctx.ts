import 'reflect-metadata';
import {Redis} from 'ioredis';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
// import {createMongoClient} from './database/mongo/createMongoClient';
// import {MongoClient} from 'mongodb';
import {
  WSClientConfigurableOptions,
  WebsocketClient,
  RestClientV5,
} from 'bybit-api';
// import {API_KEY, API_SECRET} from './config';
import {
  AppExit,
  AppSetupApiKey,
  AppSetupApiSecret,
  AppStart,
  AppStop,
  AppSyncConfig,
  AppSyncStore,
  AppWaitAndStop,
  CancelOrder,
  FilledAvgOrder,
  FilledOpenOrder,
  FilledProfitOrder,
  PartiallyFilledAvgOrder,
  SubmitAvgOrder,
  SubmitOpenOrder,
  SubmitProfitOrder,
  SyncExchState,
} from './application';
import {WsTopicHandler} from './infrastructure/adapters/handlers/WsTopicHandler';
import {Options} from './domain/entities/Options';
import {
  AppState,
  CandleStick,
  Position,
  SnapshotBuilder,
} from './domain/entities';
import {OrderBook} from './domain/entities/OrderBook';
import {
  EventListener,
  RedisSubscriber,
  WebSocketHandler,
} from './infrastructure';
import {API_KEY, API_SECRET} from './config';

export async function bootstrapCtx() {
  const eventEmitter = new EventEmitter();
  const redis = new Redis();

  const wsOptions: WSClientConfigurableOptions = {
    key: API_KEY,
    secret: API_SECRET,
    testnet: process.env.NODE_ENV === 'prod' ? false : true,
    market: 'v5',
  };

  const bybitWs = new WebsocketClient(wsOptions);
  const bybitClient = new RestClientV5({
    key: API_KEY,
    secret: API_SECRET,
    testnet: process.env.NODE_ENV === 'prod' ? false : true,
  });

  const options = new Options(redis);
  await options.loadVars();
  const orderBook = new OrderBook(redis, options, eventEmitter);
  const candleStick = new CandleStick(redis, options, eventEmitter);
  const position = new Position(redis, options);
  const state = new AppState(
    eventEmitter,
    candleStick,
    orderBook,
    options,
    position
  );

  // options

  container.register<WSClientConfigurableOptions>(
    'WSClientConfigurableOptions',
    {useValue: wsOptions}
  );

  // infra
  container.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  container.register<SnapshotBuilder>('SnapshotBuilder', SnapshotBuilder);
  container.register<RedisSubscriber>('RedisSubscriber', RedisSubscriber);
  container.register<EventListener>('EventListener', EventListener);
  container.register<WebSocketHandler>('WebSocketHandler', WebSocketHandler);

  // services
  container.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  container.register<RestClientV5>('RestClientV5', {useValue: bybitClient});

  // state
  container.register<Position>('Position', {useValue: position});
  container.register<OrderBook>('OrderBook', {useValue: orderBook});
  container.register<CandleStick>('CandleStick', {useValue: candleStick});
  container.register<Redis>('Redis', {useValue: redis});
  container.register<Options>('Options', {useValue: options});
  container.register<AppState>('AppState', {useValue: state});

  // handlers
  container.register<WsTopicHandler>('WsTopicHandler', WsTopicHandler);

  // use cases
  container.register<CancelOrder>('CancelOrder', CancelOrder);
  container.register<FilledAvgOrder>('FilledAvgOrder', FilledAvgOrder);
  container.register<FilledOpenOrder>('FilledOpenOrder', FilledOpenOrder);
  container.register<FilledProfitOrder>('FilledProfitOrder', FilledProfitOrder);
  container.register<PartiallyFilledAvgOrder>(
    'PartiallyFilledAvgOrder',
    PartiallyFilledAvgOrder
  );
  container.register<SubmitOpenOrder>('SubmitOpenOrder', SubmitOpenOrder);
  container.register<SubmitProfitOrder>('SubmitProfitOrder', SubmitProfitOrder);
  container.register<SubmitAvgOrder>('SubmitAvgOrder', SubmitAvgOrder);
  container.register<SyncExchState>('SyncExchState', SyncExchState);

  container.register<AppSetupApiKey>('AppSetupApiKey', AppSetupApiKey);
  container.register<AppSetupApiSecret>('AppSetupApiSecret', AppSetupApiSecret);
  container.register<AppStart>('AppStart', AppStart);
  container.register<AppStop>('AppStop', AppStop);
  container.register<AppSyncConfig>('AppSyncConfig', AppSyncConfig);
  container.register<AppSyncStore>('AppSyncStore', AppSyncStore);
  container.register<AppWaitAndStop>('AppWaitAndStop', AppWaitAndStop);

  container.register<AppExit>('AppExit', AppExit);
}
