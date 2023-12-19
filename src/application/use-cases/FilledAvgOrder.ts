import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {
  AppState,
  CandleStick,
  Options,
  OrderBook,
  Position,
} from '../../domain/entities';
import {AVG_ORDER_FILLED, ERROR_EVENT, LOG_EVENT} from '../../constants';

const label = 'FilledAvgOrder';

@injectable()
export class FilledAvgOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Options')
    private readonly options: Options,
    @inject('Position')
    private readonly position: Position,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('CandleStick')
    private readonly candle: CandleStick,
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
      const symbol = this.options.symbol;
      const category = this.options.category;

      log.api.info(
        `${label}:REQUEST:cancelAllOrders:${JSON.stringify({symbol, category})}`
      );
      const response = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      log.api.info(
        `${label}:RESPONSE:cancelAllOrders:${JSON.stringify(response)}|`
      );

      if (response.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label: label,
          data: JSON.stringify(response),
        });
      }

      this.orderBook.isAvgOrderExists = false;
      this.position.handleFilledAvgOrder(cumExecQty, cumExecValue, avgPrice);
      this.orderBook.incAvgOrderCount();
      this.candle.resetCandlesCount();

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
