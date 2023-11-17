import {EventEmitter} from 'events';
import {Store} from '../../domain/entities/Store';
import {CategoryV5, OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';

const apiLogger = initLogger('SubmitAvgOrder', 'logs/api.log');

@injectable()
export class SubmitAvgOrder {
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
      const category = this.store.options.category;
      const symbol = this.store.options.symbol;
      const qty = this.store.avgQty;

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Buy',
        orderType: 'Limit',
        price: this.store.avgOrderPrice,
        category,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const ordResponse = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|submitOrder|${JSON.stringify(ordResponse)}|`);
      const {retCode, result} = ordResponse;

      if (retCode === 0) this.store.openAvgOrder(result.orderId);

      return {data: ordResponse, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
