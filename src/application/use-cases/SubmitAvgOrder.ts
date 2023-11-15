import {EventEmitter} from 'events';
import {Store} from '../../domain/entities/Store';
import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {SUBMIT_AVG_ORDER} from '../../constants';
import {initLogger} from '../../utils/logger';

const logger = initLogger(__filename);
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
      logger.info(SUBMIT_AVG_ORDER);
      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.avgQty;

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Buy',
        orderType: 'Limit',
        price: this.store.avgOrderPrice,
        category: category,
      };
      console.log(body);
      const ordResponse = await this.client.submitOrder(body);
      const {retCode, result} = ordResponse;
      logger.warn(ordResponse);
      if (retCode === 0) this.store.openAvgOrder(result.orderId);

      return {data: ordResponse, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
