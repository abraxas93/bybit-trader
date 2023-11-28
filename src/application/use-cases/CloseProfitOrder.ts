import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('CloseProfitOrder', 'api.log');

@injectable()
export class CloseProfitOrder {
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

      this.state.trades.closePosition();

      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );
      this.state.trades.clearOrderBook();
      if (cancelResponse.retCode) {
        return {data: null, error: cancelResponse};
      }

      if (this.state.trades.canOpenPositionOrder)
        return {data: true, error: null};

      return {data: null, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
