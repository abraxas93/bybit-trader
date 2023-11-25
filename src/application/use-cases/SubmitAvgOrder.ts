import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('SubmitAvgOrder', 'api.log');

@injectable()
export class SubmitAvgOrder {
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
      const qty = this.state.trades.avgQty;

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Buy',
        orderType: 'Limit',
        price: this.state.trades.avgOrderPrice,
        category,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const ordResponse = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|submitOrder|${JSON.stringify(ordResponse)}|`);
      const {retCode, result} = ordResponse;

      if (retCode === 0) this.state.trades.openAvgOrder(result.orderId);

      return {data: ordResponse, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
