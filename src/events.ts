import {container} from 'tsyringe';
import {EventEmitter} from 'events';
import {
  SubmitOpenOrder,
  SubmitProfitOrder,
  SubmitAvgOrder,
  CancelOrder,
} from './application';
import {
  SUBMIT_OPEN_ORDER,
  SUBMIT_PROFIT_ORDER,
  CANCEL_ORDER,
  ERROR_EVENT,
  CANDLE_CLOSED,
  LOG_EVENT,
  AVG_ORDER_FILLED,
  OPEN_ORDER_FILLED,
  PROFIT_ORDER_FILLED,
  ORDER_CANCELLED,
  SUBMIT_AVG_ORDER,
} from './constants';
import {OrderClass} from './types';
import {log} from './utils';
import {SnapshotBuilder} from './domain/entities/SnapshotBuilder';

export function bootstrapEvents() {
  const submitOpenOrder = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
  const emitter = container.resolve<EventEmitter>('EventEmitter');
  const submitProfitOrder =
    container.resolve<SubmitProfitOrder>('SubmitProfitOrder');
  const submitAvgOrder = container.resolve<SubmitAvgOrder>('SubmitAvgOrder');
  const cancelOrder = container.resolve<CancelOrder>('CancelOrder');

  const snpBuilder = container.resolve<SnapshotBuilder>('SnapshotBuilder');
  // const state = container.resolve<AppState>('AppState');

  emitter.on(SUBMIT_OPEN_ORDER, () => {
    submitOpenOrder.execute().catch(err => log.error.error(err));
  });
  emitter.on(SUBMIT_AVG_ORDER, () => {
    submitAvgOrder.execute().catch(err => log.error.error(err));
  });
  emitter.on(SUBMIT_PROFIT_ORDER, () => {
    submitProfitOrder.execute().catch(err => log.error.error(err));
  });

  emitter.on(OPEN_ORDER_FILLED, () =>
    submitProfitOrder.execute().catch(err => log.error.error(err))
  );

  emitter.on(AVG_ORDER_FILLED, () =>
    submitProfitOrder.execute().catch(err => log.error.error(err))
  );

  emitter.on(PROFIT_ORDER_FILLED, () =>
    submitOpenOrder.execute().catch(err => log.error.error(err))
  );

  emitter.on(
    ORDER_CANCELLED,
    ({cls}: {cls: OrderClass; orderLinkId: string}) => {
      if (cls === 'TAKE_PROFIT_ORDER') {
        submitProfitOrder.execute().catch(err => log.error.error(err));
      }
    }
  );

  emitter.on(CANCEL_ORDER, (cls: OrderClass) =>
    cancelOrder.execute(cls).catch(err => log.error.error(err))
  );

  emitter.on(ERROR_EVENT, data => log.error.error(data));

  emitter.on(CANDLE_CLOSED, () => {
    submitAvgOrder.execute().catch(err => log.error.error(err));
    submitOpenOrder.execute().catch(err => log.error.error(err));
  });

  emitter.on(LOG_EVENT, (label: string) => {
    log.candle.info(`${label}:${snpBuilder.getStateSnapshot('candle')}`);
    log.order.info(`${label}:${snpBuilder.getStateSnapshot('orderBook')}`);
    log.position.info(`${label}:${snpBuilder.getStateSnapshot('position')}`);
  });
}
