import 'reflect-metadata';
import {initLogger} from './utils/logger';
import {container} from 'tsyringe';
import {EventEmitter} from 'events';
import {WebsocketClient} from 'bybit-api';
import {bootstrapCtx} from './infrastructure/ctx';
import {
  CANDLE_CLOSED,
  ERROR_EVENT,
  SUBMIT_OPEN_ORDER,
  SUBMIT_PROFIT_ORDER,
} from './constants';
import {Store} from './domain/entities/Store';
import {
  SubmitAvgOrder,
  SubmitOpenOrder,
  SubmitProfitOrder,
} from './application';
import {WsTopicHandler} from './infrastructure/adapters/handlers/WsTopicHandler';
import {Topic} from './types';
import {SYMBOL} from './config';

const logger = initLogger(__filename);

function bootstrapEvents() {
  const submitOpenOrder = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
  const submitProfitOrder =
    container.resolve<SubmitProfitOrder>('SubmitProfitOrder');
  const submitAvgOrder = container.resolve<SubmitAvgOrder>('SubmitAvgOrder');
  const store = container.resolve<Store>('Store');
  const emitter = container.resolve<EventEmitter>('EventEmitter');

  emitter.on(SUBMIT_OPEN_ORDER, () => {
    submitOpenOrder.execute().catch(err => logger.error(err));
  });
  emitter.on(SUBMIT_PROFIT_ORDER, () => {
    submitProfitOrder.execute().catch(err => logger.error(err));
  });
  emitter.on(ERROR_EVENT, data => logger.error(data));

  emitter.on(CANDLE_CLOSED, () => {
    store.canOpenAvgOrder &&
      submitAvgOrder.execute().catch(err => logger.error(err));

    !store.isPositionOpened &&
      submitOpenOrder.execute().catch(err => logger.error(err));
  });
}

function bootstrapSockets() {
  const ws = container.resolve<WebsocketClient>('WebsocketClient');
  const wsHandler = container.resolve<WsTopicHandler>('WsTopicHandler');
  // 'order', 'position', 'execution',
  // ws.subscribeV5(`kline.1.BTCUSDT`, 'linear').catch(err => console.log(err));

  ws.subscribeV5([`tickers.${SYMBOL}`, 'order'], 'linear').catch(err =>
    console.log(err)
  );

  // ws.subscribe('kline.BTCUSD.1m').catch(err => console.log(err));

  ws.on('update', data => wsHandler.handle(data as Topic));

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

async function main() {
  logger.info('bootstrap app dependencies');
  await bootstrapCtx();
  bootstrapSockets();
  bootstrapEvents();
  setTimeout(async () => {
    const useCase = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
    await useCase.execute();
  }, 4000);
}

main().catch(err => console.log(err));
