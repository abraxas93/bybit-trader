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
  AmmendOrder,
  AppExit,
  AppSetupApiKey,
  AppSetupApiSecret,
  AppStart,
  AppStop,
  AppSwitchSymbol,
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
  UpdateDigitsAfter,
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
import {API_KEY, API_SECRET, REDIS_HOST} from './config';
import {createMongoClient} from './infrastructure/database/mongo/createMongoClient';
import {MongoClient} from 'mongodb';
import {BybitService, ErrorService} from './application/services';

export async function bootstrapCtx() {
  const eventEmitter = new EventEmitter();
  const redis = new Redis({port: 6379, host: REDIS_HOST});
  const mongodb = await createMongoClient();

  const wsOptions: WSClientConfigurableOptions = {
    key: API_KEY,
    secret: API_SECRET,
    testnet: process.env.NODE_ENV === 'production' ? false : true,
    market: 'v5',
  };

  const bybitWs = new WebsocketClient(wsOptions);
  const bybitClient = new RestClientV5({
    key: API_KEY,
    secret: API_SECRET,
    testnet: process.env.NODE_ENV === 'production' ? false : true,
  });

  const options = new Options(redis);
  await options.loadVars();
  const orderBook = new OrderBook(redis, options, eventEmitter);
  const candleStick = new CandleStick(redis, options, eventEmitter);
  const position = new Position(redis, options);
  const state = new AppState(candleStick, orderBook, options, position, redis);
  const errService = new ErrorService(state, mongodb);
  const bybitService = new BybitService(errService, bybitClient, mongodb);

  // options

  container.register<WSClientConfigurableOptions>(
    'WSClientConfigurableOptions',
    {useValue: wsOptions}
  );

  // infra
  container.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  container.register<MongoClient>('MongoClient', {useValue: mongodb});
  container.register<SnapshotBuilder>('SnapshotBuilder', SnapshotBuilder);
  container.register<RedisSubscriber>('RedisSubscriber', RedisSubscriber);
  container.register<EventListener>('EventListener', EventListener);
  container.register<WebSocketHandler>('WebSocketHandler', WebSocketHandler);

  // services
  container.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  container.register<RestClientV5>('RestClientV5', {useValue: bybitClient});
  container.register<BybitService>('BybitService', {useValue: bybitService});
  container.register<ErrorService>('ErrorService', {useValue: errService});

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
  container.register<AmmendOrder>('AmmendOrder', AmmendOrder);
  container.register<UpdateDigitsAfter>('UpdateDigitsAfter', UpdateDigitsAfter);

  container.register<AppSetupApiKey>('AppSetupApiKey', AppSetupApiKey);
  container.register<AppSetupApiSecret>('AppSetupApiSecret', AppSetupApiSecret);
  container.register<AppStart>('AppStart', AppStart);
  container.register<AppStop>('AppStop', AppStop);
  container.register<AppSyncConfig>('AppSyncConfig', AppSyncConfig);
  container.register<AppSyncStore>('AppSyncStore', AppSyncStore);
  container.register<AppWaitAndStop>('AppWaitAndStop', AppWaitAndStop);

  container.register<AppExit>('AppExit', AppExit);
  container.register<AppSwitchSymbol>('AppSwitchSymbol', AppSwitchSymbol);
}
