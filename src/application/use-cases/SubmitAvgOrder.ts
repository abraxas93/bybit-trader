import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';
import {normalizeFloat} from '../../utils';

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

      const orderLinkId = String(Date.now());

      const body: OrderParamsV5 = {
        symbol,
        qty: normalizeFloat(qty),
        side: 'Buy',
        orderType: 'Limit',
        price: this.state.trades.avgOrderPrice,
        category,
        orderLinkId,
      };

      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      this.state.trades.addToOrdBook(orderLinkId, 'AVERAGE_ORDER');
      this.state.trades.openAvgOrder();
      const ordResponse = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|submitOrder|${JSON.stringify(ordResponse)}|`);

      const {retCode} = ordResponse;
      if (retCode !== 0) this.state.trades.removeFromOrdBook(orderLinkId);

      return {data: ordResponse, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
