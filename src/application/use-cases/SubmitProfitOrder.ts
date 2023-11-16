import {EventEmitter} from 'events';
import {Store} from '../../domain/entities/Store';
import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';

const apiLogger = initLogger('SubmitProfitOrder', 'logs/api.log');

@injectable()
export class SubmitProfitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Store')
    private readonly store: Store,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  async execute() {
    try {
      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.posQty;

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Sell',
        orderType: 'Limit',
        price: this.store.profitOrderPrice,
        category: category,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const response = await this.client.submitOrder(body);
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(response)}|`);
      const {retCode, result} = response;

      if (retCode === 0) {
        this.store.addOrder(result.orderId, 'TAKE_PROFIT_ORDER');
      }
      return {data: response, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
