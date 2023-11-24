/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {initLogger} from './utils/logger';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {bootstrapCtx} from './ctx';
import {
  CANDLE_CLOSED,
  ERROR_EVENT,
  LOG_EVENT,
  RKEYS,
  SUBMIT_OPEN_ORDER,
  SUBMIT_PROFIT_ORDER,
} from './constants';
import {
  SubmitAvgOrder,
  SubmitOpenOrder,
  SubmitProfitOrder,
} from './application';
import {WsTopicHandler} from './infrastructure/adapters/handlers/WsTopicHandler';
import {Topic} from './types';
import {SYMBOL} from './config';
import {setupTradeOptions} from './scripts';
import {StateContainer} from './domain/entities';
import Redis from 'ioredis';

const errLogger = initLogger('index.ts', 'logs/errors.log');
const logsLogger = initLogger('index.ts', 'logs/logs.log');
const socketLogger = initLogger('index.ts', 'logs/sockets.log', true);
const storeLogger = initLogger('', 'logs/store.log', true);

const SESSION_ID = Date.now();

if (process.env.SETUP_VARS) {
  (async () => {
    await setupTradeOptions();
    console.log('>>> setup:redis:vars');
    process.exit();
  })().catch(err => errLogger.error(err));
} else if (process.env.TEST) {
  bootstrapCtx();
  // const opts = container.resolve<Options>('Options');
  const state = container.resolve<StateContainer>('StateContainer');
  setTimeout(() => console.log(state), 3000);
} else {
  main();
}

function bootstrapEvents() {
  const submitOpenOrder = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
  const submitProfitOrder =
    container.resolve<SubmitProfitOrder>('SubmitProfitOrder');
  const submitAvgOrder = container.resolve<SubmitAvgOrder>('SubmitAvgOrder');

  const emitter = container.resolve<EventEmitter>('EventEmitter');
  const state = container.resolve<StateContainer>('StateContainer');

  emitter.on(SUBMIT_OPEN_ORDER, () => {
    submitOpenOrder.execute().catch(err => errLogger.error(err));
  });
  emitter.on(SUBMIT_PROFIT_ORDER, () => {
    submitProfitOrder.execute().catch(err => errLogger.error(err));
  });
  emitter.on(ERROR_EVENT, data => errLogger.error(data));

  emitter.on(CANDLE_CLOSED, () => {
    state.canOpenAvgOrder &&
      submitAvgOrder.execute().catch(err => errLogger.error(err));

    !state.trades.isPositionExists &&
      submitOpenOrder.execute().catch(err => errLogger.error(err));
  });

  emitter.on(LOG_EVENT, (label: string) => {
    storeLogger.info(JSON.stringify(state.getSnapshot(label)));
  });
}

function bootstrapSockets() {
  const ws = container.resolve<WebsocketClient>('WebsocketClient');
  const wsHandler = container.resolve<WsTopicHandler>('WsTopicHandler');
  // 'order', 'position', 'execution'

  ws.subscribeV5([`tickers.${SYMBOL}`, 'order'], 'linear').catch(err =>
    socketLogger.error(JSON.stringify(err))
  );

  // ws.subscribe('kline.BTCUSD.1m').catch(err => console.log(err));

  ws.on('update', data => wsHandler.handle(data as Topic));

  // Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
  ws.on('open', ({wsKey, event}) => {
    socketLogger.info(
      'connection open for websocket with ID: ' + wsKey + ' event: ',
      JSON.stringify(event)
    );
  });

  // Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
  ws.on('response', response => {
    socketLogger.warn(JSON.stringify(response));
  });

  // Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
  ws.on('close', () => {
    socketLogger.warn('connection closed');
  });

  // Optional: Listen to raw error events. Recommended.
  ws.on('error', err => {
    socketLogger.error(JSON.stringify(err));
  });
}

function main() {
  logsLogger.info(`--- start:${SESSION_ID} ---`);
  bootstrapCtx();
  bootstrapSockets();
  bootstrapEvents();
  setTimeout(async () => {
    if (!state.trades.isPositionExists) {
      const useCase = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
      await useCase.execute();
    } else {
      const useCase = container.resolve<SubmitProfitOrder>('SubmitProfitOrder');
      await useCase.execute();
    }
  }, 4000);

  const client = container.resolve<RestClientV5>('RestClientV5');
  const state = container.resolve<StateContainer>('StateContainer');
  const redis = container.resolve<Redis>('Redis');
  // const emitter = container.resolve<EventEmitter>('EventEmitter');

  const cb = async () => {
    try {
      const symbol = state.options.symbol;
      const category = state.options.category;
      const cancelResponse = await client.cancelAllOrders({symbol, category});
      logsLogger.info(cancelResponse);
      if (cancelResponse.retCode) {
        errLogger.error(JSON.stringify(cancelResponse));
      } else {
        await redis.set(RKEYS.AVG_ORDER_EXISTS, 'false');
      }
    } catch (error) {
      console.log(error);
    }
  };

  process.on('SIGINT', async () => {
    logsLogger.info(`--- end:${SESSION_ID} ---`);
    await cb().finally(() => process.exit(0));
  });
}
