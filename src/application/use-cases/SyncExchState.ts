import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {StateContainer} from '../../domain/entities';

@injectable()
export class SyncExchState {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer
  ) {}
  async execute() {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;
      log.api.info(`REQUEST|getPositionInfo|${symbol} ${category}|`);
      const response = await this.client.getPositionInfo({
        symbol,
        category,
      });
      log.api.info(`RESPONSE|cancelAllOrders|${JSON.stringify(response)}|`);
      const position = response.result.list.pop();
      if (position?.side === 'None') {
        log.api.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
        const cancelResponse = await this.client.cancelAllOrders({
          category: category,
          symbol,
        });
        log.api.info(
          `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
        );
        if (cancelResponse.retCode) {
          return {data: null, error: cancelResponse};
        }
        this.state.trades.clearOrderBook();
        this.state.trades.closePosition();
        this.state.unpause();
        return {data: true, error: null};
      } else {
        const symbol = this.state.options.symbol;
        const category = this.state.options.category;

        const orderResponse = await this.client.getActiveOrders({
          symbol,
          category,
        });

        if (orderResponse.retCode) {
          return {data: null, error: orderResponse};
        }

        // const {size} = position;
        const orderIds = this.state.trades.orderIds;

        const linkedIds = orderResponse.result.list.map(o => o.orderLinkId);
        orderIds.forEach(id => {
          if (!linkedIds.includes(id)) {
            const cls = this.state.trades.getOrderClass(id);
          }
        });
        // update quantity
        // get all orders from exch
        // get all orders from store
        // update store
        // unpause
        this.state.unpause();
        // continue
        return {data: true, error: null};
      }
    } catch (error) {
      return {error: (error as Error).message, data: null};
    }
  }
}
