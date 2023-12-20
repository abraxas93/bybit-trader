import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {AmendOrderParamsV5} from 'bybit-api';
import {BybitService} from '../services';

const label = 'PartiallyFilledAvgOrder';
@injectable()
export class PartiallyFilledAvgOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState,
    @inject('BybitService')
    private readonly service: BybitService
  ) {}

  async execute({
    cumExecQty,
    cumExecValue,
  }: {
    cumExecQty: string;
    cumExecValue: string;
  }) {
    try {
      this.state.position.partiallyFillAvgOrder(cumExecQty, cumExecValue);
      const orderId = this.state.orderBook.profitOrderId;
      const qty = this.state.position.posQty;
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;
      const price = this.state.position.profitOrderPrice;

      await this.service.amendOrder(label, {
        symbol,
        category,
        orderId,
        qty,
        price,
      } as AmendOrderParamsV5);

      this.state.position.lastProfitCumExecQty = '0';

      this.emitter.emit(LOG_EVENT, {
        label,
        data: {cumExecQty, cumExecValue},
      });
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
