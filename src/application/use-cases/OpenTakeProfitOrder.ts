import {Store} from '../../domain/entities/Store';
import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../logger';

const logger = initLogger(__filename);

@injectable()
export class OpenTakeProfitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Store')
    private readonly store: Store
  ) {}

  async execute() {
    try {
      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.quantity; // TODO: change this to position quantity

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Sell',
        orderType: 'Limit',
        price: String(this.store.getTakeProfitOrderPrice()),
        category: category,
      };

      logger.info('ORDER , ', {...body, type: 'TAKE_PROFIT_ORDER'});

      const response = await this.client.submitOrder(body);
      const {retCode, result} = response;

      logger.info('RESPONSE ,', response);

      if (retCode === 0) {
        this.store.addOrder(result.orderId, 'TAKE_PROFIT_ORDER');
      }
      return {data: response, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
