/* eslint-disable no-process-exit */
import 'reflect-metadata';
import {Redis} from 'ioredis';
import {initLogger} from './utils/logger';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {bootstrapCtx} from './ctx';
import {
  CANDLE_CLOSED,
  ERROR_EVENT,
  LOG_EVENT,
  REOPEN_PROFIT_ORDER,
  RKEYS,
  SUBMIT_OPEN_ORDER,
  SUBMIT_PROFIT_ORDER,
} from './constants';
import {
  ReopenProfitOrder,
  SubmitAvgOrder,
  SubmitOpenOrder,
  SubmitProfitOrder,
} from './application';
import {WsTopicHandler} from './infrastructure/adapters/handlers/WsTopicHandler';
import {Topic} from './types';
import {
  SYMBOL,
  BASE_QUANTITY,
  TIME_FRAME,
  MARTIN_GALE,
  TAKE_PROFIT_RATE,
  AVG_BUY_RATE,
  MAX_AVG_ORDER_COUNT,
  CANDLES_TO_WAIT,
  DIGITS_AFTER_COMMA,
  CATEGORY,
  TRADE_CYCLES,
} from './config';

import {StateContainer} from './domain/entities';

const errLogger = initLogger('index.ts', 'errors.log');
const logsLogger = initLogger('index.ts', 'logs.log');
const socketLogger = initLogger('index.ts', 'sockets.log', true);
const storeLogger = initLogger('', 'store.log', true);

main();
logsLogger.info(
  JSON.stringify({
    SYMBOL,
    BASE_QUANTITY,
    TIME_FRAME,
    MARTIN_GALE,
    TAKE_PROFIT_RATE,
    AVG_BUY_RATE,
    MAX_AVG_ORDER_COUNT,
    CANDLES_TO_WAIT,
    DIGITS_AFTER_COMMA,
    CATEGORY,
    TRADE_CYCLES,
  })
);

function bootstrapEvents() {
  const submitOpenOrder = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
  const submitProfitOrder =
    container.resolve<SubmitProfitOrder>('SubmitProfitOrder');
  const submitAvgOrder = container.resolve<SubmitAvgOrder>('SubmitAvgOrder');
  const reopenProfitOrder =
    container.resolve<ReopenProfitOrder>('ReopenProfitOrder');

  const emitter = container.resolve<EventEmitter>('EventEmitter');
  const state = container.resolve<StateContainer>('StateContainer');

  emitter.on(SUBMIT_OPEN_ORDER, () => {
    submitOpenOrder.execute().catch(err => errLogger.error(err));
  });
  emitter.on(SUBMIT_PROFIT_ORDER, () => {
    submitProfitOrder.execute().catch(err => errLogger.error(err));
  });
  emitter.on(REOPEN_PROFIT_ORDER, () => {
    reopenProfitOrder.execute().catch(err => errLogger.error(err));
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

  // ws.on('reconnect', ({wsKey}) => {
  //   console.log('ws automatically reconnecting.... ', wsKey);
  // });
  ws.on('reconnected', data => {
    console.log('ws has reconnected ', data?.wsKey);
  });
}

function main() {
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
      errLogger.error(JSON.stringify(error));
    }
  };

  process.on('SIGINT', async () => {
    await cb().finally(() => process.exit(0));
  });
}
