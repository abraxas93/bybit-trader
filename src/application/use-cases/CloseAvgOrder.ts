import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('CloseAvgOrder', 'api.log');

@injectable()
export class CloseAvgOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer
  ) {}

  async execute({
    avgPrice,
    cumExecQty,
    cumExecValue,
  }: {
    avgPrice: string;
    cumExecQty: string;
    cumExecValue: string;
  }) {
    try {
      this.state.trades.closeAvgOrder(avgPrice, cumExecQty, cumExecValue);
      this.state.candles.resetCandlesCount();
      this.state.resetReopenTimer();

      const symbol = this.state.options.symbol;
      const category = this.state.options.category;

      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );

      if (cancelResponse.retCode) {
        return {data: null, error: cancelResponse};
      }

      this.state.trades.clearOrderBook();

      return {data: true, error: null};
    } catch (error) {
      return {data: null, error};
    }
  }
}
