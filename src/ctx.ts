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
import {API_KEY, API_SECRET} from './config';
import {
  ReopenProfitOrder,
  SubmitAvgOrder,
  SubmitOpenOrder,
  SubmitProfitOrder,
} from './application';
import {WsTopicHandler} from './infrastructure/adapters/handlers/WsTopicHandler';
import {ProcessOrderData} from './application/use-cases/ProcessOrderData';
import {Options} from './domain/entities/Options';
import {CandleState, StateContainer} from './domain/entities';
import {TradeState} from './domain/entities/TradeState';

export function bootstrapCtx() {
  // const mongoClient = await createMongoClient();
  const eventEmitter = new EventEmitter();
  const redis = new Redis();

  const wsOptions: WSClientConfigurableOptions = {
    key: API_KEY,
    secret: API_SECRET,
    testnet: process.env.NODE_ENV === 'test' ? true : false,
    market: 'v5',
  };

  const bybitWs = new WebsocketClient(wsOptions);

  const bybitClient = new RestClientV5({
    key: API_KEY,
    secret: API_SECRET,
    testnet: process.env.NODE_ENV === 'test' ? true : false,
  });
  const options = new Options(redis);
  const tradeState = new TradeState(redis, options, eventEmitter);
  const candleState = new CandleState(redis, options, eventEmitter);

  container.register<TradeState>('TradeState', {useValue: tradeState});
  container.register<CandleState>('CandleState', {useValue: candleState});
  container.register<Redis>('Redis', {useValue: redis});
  container.register<Options>('Options', {useValue: options});
  container.register<EventEmitter>('EventEmitter', {useValue: eventEmitter});
  container.register<WebsocketClient>('WebsocketClient', {useValue: bybitWs});
  container.register<RestClientV5>('RestClientV5', {useValue: bybitClient});

  container.register<StateContainer>('StateContainer', {
    useValue: new StateContainer(
      eventEmitter,
      tradeState,
      candleState,
      options
    ),
  });

  container.register<ProcessOrderData>('ProcessOrderData', ProcessOrderData);

  container.register<WsTopicHandler>('WsTopicHandler', WsTopicHandler);

  container.register<SubmitOpenOrder>('SubmitOpenOrder', SubmitOpenOrder);
  container.register<SubmitProfitOrder>('SubmitProfitOrder', SubmitProfitOrder);
  container.register<SubmitAvgOrder>('SubmitAvgOrder', SubmitAvgOrder);
  container.register<ReopenProfitOrder>('ReopenProfitOrder', ReopenProfitOrder);
}
