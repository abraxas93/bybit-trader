import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {Options, OrderBook} from '../../domain/entities';
import {ERROR_EVENT, SUBMIT_PROFIT_ORDER} from '../../constants';

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

  async execute(side: string) {
    try {
      const category = this.options.category;
      const symbol = this.options.symbol;

      const activeOrdersResponse = await this.client.getActiveOrders({
        symbol,
        category,
      });

      if (activeOrdersResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(activeOrdersResponse),
        });
      }

      const sideOrder = activeOrdersResponse.result.list.find(
        o => o.side === side
      );

      if (!sideOrder) {
        return;
      }
      const {orderId} = sideOrder;
      const body = {
        orderId,
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
      }

      if (side === 'Sell') {
        this.orderBook.profitOrderId = '';
        this.emitter.emit(SUBMIT_PROFIT_ORDER);
      }
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
