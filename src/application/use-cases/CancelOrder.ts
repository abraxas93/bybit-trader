import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {Options, OrderBook} from '../../domain/entities';
import {ERROR_EVENT, ORDER_CANCELLED} from '../../constants';
import {OrderClass} from '../../types';

const label = 'CancelOrder';
@injectable()
export class CancelOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Options')
    private readonly options: Options,
    @inject('OrderBook')
    private readonly orderBook: OrderBook
  ) {}

  async execute(cls: OrderClass) {
    try {
      const category = this.options.category;
      const symbol = this.options.symbol;

      const orderLinkId = this.orderBook.getOrderIdBy(cls);
      if (!orderLinkId) {
        this.emitter.emit(
          ERROR_EVENT,
          JSON.stringify({
            label,
            data: orderLinkId,
          })
        );
        return;
      }

      const body = {
        orderLinkId,
        symbol,
        category,
      };

      log.api.info(`${label}:REQUEST|cancelOrder|${JSON.stringify(body)}|`);
      const response = await this.client.cancelOrder(body);
      log.api.info(
        `${label}:RESPONSE|cancelOrder|${JSON.stringify(response)}|`
      );

      if (response.retCode) {
        this.emitter.emit(
          ERROR_EVENT,
          JSON.stringify({
            label,
            data: JSON.stringify(response),
          })
        );
      } else this.orderBook.removeFromOrdBook(orderLinkId);

      this.emitter.emit(ORDER_CANCELLED, {cls, orderLinkId});
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  }
}
