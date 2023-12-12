import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {Options, OrderBook, Position} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT, PROFIT_ORDER_FILLED} from '../../constants';

const label = 'FilledProfitOrder';

@injectable()
export class FilledProfitOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Options')
    private readonly options: Options,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly position: Position
  ) {}

  async execute() {
    try {
      const category = this.options.category;
      const symbol = this.options.symbol;

      this.orderBook.handleFilledProfitOrder();
      this.position.handleFilledProfitOrder();

      log.api.info(
        `${label}:REQUEST:cancelAllOrders:${JSON.stringify({symbol, category})}`
      );
      const response = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      log.api.info(
        `${label}:RESPONSE:cancelAllOrders|${JSON.stringify(response)}|`
      );
      this.orderBook.clearOrderBook();
      if (response.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(response),
        });
      }

      this.emitter.emit(PROFIT_ORDER_FILLED);
      this.emitter.emit(LOG_EVENT, {label});
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
