import {container, inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {
  SubmitOpenOrder,
  SubmitProfitOrder,
  SubmitAvgOrder,
  CancelOrder,
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
  ORDER_CANCELLED,
  SUBMIT_AVG_ORDER,
} from '../constants';
import {OrderClass} from '../types';
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
    private readonly snpBuilder: SnapshotBuilder
  ) {}

  startListening(emitter: EventEmitter) {
    emitter.on(SUBMIT_OPEN_ORDER, this.handleOpenOrder.bind(this));
    emitter.on(SUBMIT_AVG_ORDER, this.handleAvgOrder.bind(this));
    emitter.on(SUBMIT_PROFIT_ORDER, this.handleProfitOrder.bind(this));
    emitter.on(OPEN_ORDER_FILLED, this.handleOpenOrderFilled.bind(this));
    emitter.on(AVG_ORDER_FILLED, this.handleAvgOrderFilled.bind(this));
    emitter.on(PROFIT_ORDER_FILLED, this.handleProfitOrderFilled.bind(this));
    emitter.on(ORDER_CANCELLED, this.handleOrderCancelled.bind(this));
    emitter.on(CANCEL_ORDER, this.handleCancelOrder.bind(this));
    emitter.on(ERROR_EVENT, this.handleError.bind(this));
    emitter.on(CANDLE_CLOSED, this.handleCandleClosed.bind(this));
    emitter.on(LOG_EVENT, this.handleLogEvent.bind(this));
  }

  private async handleOpenOrder() {
    await this.submitOpenOrder.execute().catch(err => log.errs.error(err));
  }

  private async handleAvgOrder() {
    await this.submitAvgOrder.execute().catch(err => log.errs.error(err));
  }

  private async handleProfitOrder() {
    await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
  }

  private async handleOpenOrderFilled() {
    await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
  }

  private async handleAvgOrderFilled() {
    await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
  }

  private async handleProfitOrderFilled() {
    await this.submitOpenOrder.execute().catch(err => log.errs.error(err));
  }

  private async handleOrderCancelled({
    cls,
    orderLinkId,
  }: {
    cls: OrderClass;
    orderLinkId: string;
  }) {
    if (cls === 'TAKE_PROFIT_ORDER') {
      await this.submitProfitOrder.execute().catch(err => log.errs.error(err));
    }
  }

  private async handleCancelOrder(cls: OrderClass) {
    await this.cancelOrder.execute(cls).catch(err => log.errs.error(err));
  }

  private handleError(data: any) {
    log.errs.error(JSON.stringify(data));
  }

  private async handleCandleClosed() {
    await this.submitAvgOrder.execute().catch(err => log.errs.error(err));
    await this.submitOpenOrder.execute().catch(err => log.errs.error(err));
  }

  private handleLogEvent(label: string) {
    log.candle.info(`${label}:${this.snpBuilder.getStateSnapshot('candle')}`);
    log.order.info(`${label}:${this.snpBuilder.getStateSnapshot('orderBook')}`);
    log.position.info(
      `${label}:${this.snpBuilder.getStateSnapshot('position')}`
    );
  }
}

export function bootstrapEvents() {
  const eventListener = container.resolve<EventListener>(EventListener);
  const emitter = container.resolve<EventEmitter>('EventEmitter');
  eventListener.startListening(emitter);
}
