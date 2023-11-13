import {EventEmitter} from 'events';
import {Store} from '../../domain/entities/Store';
import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../logger';
import {SUBMIT_PROFIT_ORDER} from '../../constants';

const logger = initLogger(__filename);

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
      logger.info(SUBMIT_PROFIT_ORDER);
      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.posQty;

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Sell',
        orderType: 'Limit',
        price: String(this.store.getTakeProfitOrderPrice()),
        category: category,
      };
      console.log(body);
      const response = await this.client.submitOrder(body);
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
