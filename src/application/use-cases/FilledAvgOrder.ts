import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {AppState} from '../../domain/entities';
import {AVG_ORDER_FILLED, ERROR_EVENT, LOG_EVENT} from '../../constants';
import {BybitService} from '../services';

const label = 'FilledAvgOrder';

@injectable()
export class FilledAvgOrder {
  constructor(
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  async execute({
    avgPrice,
    cumExecQty,
    cumExecValue,
  }: {
    avgPrice: string;
    cumExecQty: string;
    cumExecValue: string;
  }) {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;

      const response = await this.service.cancelAllOrders(label, {
        category: category,
        symbol,
      });

      if (response.retCode) {
        return;
      }

      this.state.orderBook.isAvgOrderExists = false;
      this.state.position.handleFilledAvgOrder(
        cumExecQty,
        cumExecValue,
        avgPrice
      );
      this.state.orderBook.incAvgOrderCount();
      this.state.candle.resetCandlesCount();

      this.emitter.emit(AVG_ORDER_FILLED);
      this.emitter.emit(LOG_EVENT, label);
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label: label,
        data: JSON.stringify(error),
      });
    }
  }
}
