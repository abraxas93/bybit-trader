import {container, inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {
  SubmitOpenOrder,
  SubmitProfitOrder,
  SubmitAvgOrder,
  CancelOrder,
  AmmendOrder,
} from '../application';
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
  SUBMIT_AVG_ORDER,
  AMMEND_ORDER,
} from '../constants';

import {log} from '../utils';
import {SnapshotBuilder} from '../domain/entities/SnapshotBuilder';

@injectable()
export class EventListener {
  constructor(
    @inject('SubmitOpenOrder')
    private readonly submitOpenOrder: SubmitOpenOrder,
    @inject('SubmitProfitOrder')
    private readonly submitProfitOrder: SubmitProfitOrder,
    @inject('SubmitAvgOrder')
    private readonly submitAvgOrder: SubmitAvgOrder,
    @inject('CancelOrder')
    private readonly cancelOrder: CancelOrder,
    @inject('SnapshotBuilder')
    private readonly snpBuilder: SnapshotBuilder,
    @inject('AmmendOrder')
    private readonly ammendOrder: AmmendOrder
  ) {}

  startListening(emitter: EventEmitter) {
    emitter.on(SUBMIT_OPEN_ORDER, this.handleOpenOrder);
    emitter.on(SUBMIT_AVG_ORDER, this.handleAvgOrder);
    emitter.on(SUBMIT_PROFIT_ORDER, this.handleProfitOrder);
    emitter.on(OPEN_ORDER_FILLED, this.handleOpenOrderFilled);
    emitter.on(AVG_ORDER_FILLED, this.handleAvgOrderFilled);
    emitter.on(PROFIT_ORDER_FILLED, this.handleProfitOrderFilled);
    emitter.on(CANCEL_ORDER, this.handleCancelOrder);
    emitter.on(ERROR_EVENT, this.handleError);
    emitter.on(CANDLE_CLOSED, this.handleCandleClosed);
    emitter.on(LOG_EVENT, this.handleLogEvent);
    emitter.on(AMMEND_ORDER, this.handleAmmendOrder);
  }

  private handleAmmendOrder = async (side: string) => {
    await this.ammendOrder.execute(side).catch(err => log.errs.error(err));
  };

  private handleOpenOrder = async () => {
    await this.submitOpenOrder.execute().catch(err => log.errs.error(err));
  };

  private handleAvgOrder = async () => {
    await this.submitAvgOrder.execute().catch(err => log.errs.error(err));
  };

  private handleProfitOrder = async () => {
    await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
  };

  private handleOpenOrderFilled = async () => {
    await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
  };

  private handleAvgOrderFilled = async () => {
    await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
  };

  private handleProfitOrderFilled = async () => {
    await this.submitOpenOrder.execute().catch(err => log.errs.error(err));
  };

  private handleCancelOrder = async (side: string) => {
    await this.cancelOrder.execute(side).catch(err => log.errs.error(err));
  };

  private handleError = (data: {
    label: string;
    message: string;
    stack: string;
  }) => {
    log.errs.error(JSON.stringify(data));
  };

  private handleCandleClosed = async () => {
    await this.submitAvgOrder.execute().catch(err => log.errs.error(err));
    await this.submitOpenOrder.execute().catch(err => log.errs.error(err));
  };

  private handleLogEvent = (label: string) => {
    log.candle.info(`${label}:${this.snpBuilder.getStateSnapshot('candle')}`);
    log.order.info(`${label}:${this.snpBuilder.getStateSnapshot('orderBook')}`);
    log.position.info(
      `${label}:${this.snpBuilder.getStateSnapshot('position')}`
    );
  };
}

export function bootstrapEvents() {
  const eventListener = container.resolve<EventListener>(EventListener);
  const emitter = container.resolve<EventEmitter>('EventEmitter');
  eventListener.startListening(emitter);
}
