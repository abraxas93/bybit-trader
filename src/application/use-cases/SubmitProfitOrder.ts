import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('SubmitProfitOrder', 'api.log');

@injectable()
export class SubmitProfitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer
  ) {}

  async execute() {
    try {
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;
      const qty = this.state.trades.posQty;

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Sell',
        orderType: 'Limit',
        price: this.state.trades.profitOrderPrice,
        category: category,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const response = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|submitOrder|${JSON.stringify(response)}|`);
      const {retCode, result} = response;

      if (retCode === 0) {
        this.state.trades.addToOrdBook(result.orderId, 'TAKE_PROFIT_ORDER');
      }
      return {data: response, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
