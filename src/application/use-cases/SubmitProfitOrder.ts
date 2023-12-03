import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {Options, OrderBook, Position} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {getOrderLinkId, log} from '../../utils';

const label = 'SubmitProfitOrder';
@injectable()
export class SubmitProfitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Options')
    private readonly options: Options,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly postion: Position,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  async execute() {
    try {
      const category = this.options.category;
      const symbol = this.options.symbol;
      const qty = this.postion.posQty;
      const price = this.postion.profitOrderPrice;
      const orderLinkId = getOrderLinkId();

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Sell',
        orderType: 'Limit',
        price,
        category,
        orderLinkId,
      };
      log.api.info(`${label}:REQUEST|submitOrder|${JSON.stringify(body)}|`);
      this.orderBook.addToOrdBook(orderLinkId, 'TAKE_PROFIT_ORDER');
      const response = await this.client.submitOrder(body);
      log.api.info(
        `${label}:RESPONSE|submitOrder|${JSON.stringify(response)}|`
      );
      const {retCode} = response;

      if (retCode) {
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
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
      // TODO: do rollback
    }
  }
}
