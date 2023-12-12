import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {log, getOrderLinkId} from '../../utils';
import {AppState, Options, OrderBook, Position} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';

const label = 'SubmitAvgOrder';

@injectable()
export class SubmitAvgOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Options')
    private readonly options: Options,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly postion: Position,
    @inject('AppState')
    private readonly state: AppState,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  async execute() {
    if (!this.state.canOpenAvgOrder) return;
    const orderLinkId = getOrderLinkId();
    try {
      const category = this.options.category;
      const symbol = this.options.symbol;
      const qty = this.postion.avgQty;
      const price = this.postion.avgOrderPrice;
      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Buy',
        orderType: 'Limit',
        price,
        category,
        orderLinkId,
      };

      this.orderBook.isAvgOrderExists = true;
      this.orderBook.addToOrdBook(orderLinkId, 'AVERAGE_ORDER');

      log.api.info(`${label}:REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const response = await this.client.submitOrder(body);
      log.api.info(
        `${label}:RESPONSE|submitOrder|${JSON.stringify(response)}|`
      );

      const {retCode} = response;
      if (retCode) {
        this.orderBook.removeFromOrdBook(orderLinkId);
        this.orderBook.isAvgOrderExists = false;
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(response),
        });
      }

      this.emitter.emit(LOG_EVENT, {
        label,
        data: null,
      });
    } catch (error) {
      this.orderBook.removeFromOrdBook(orderLinkId);
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
