import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT} from '../../constants';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('SubmitOpenOrder', 'api.log');

@injectable()
export class SubmitOpenOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}
  async execute() {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;
      const qty: string = this.state.options.quantity;
      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        symbol,
        category,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );
      if (cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }
      this.state.trades.clearOrderBook();
      let lastCandleLowPrice = this.state.candles.lastCandleLowPrice;

      if (lastCandleLowPrice === '0') {
        apiLogger.info(`REQUEST|getKline|${symbol} ${category} 1|`);
        const response = await this.client.getKline({
          category: category as 'linear' | 'spot' | 'inverse',
          symbol: symbol,
          interval: '1',
        });
        apiLogger.info(`RESPONSE|getKline|${JSON.stringify(response)}|`);
        const [, , , , lowPrice] = response.result.list[0];
        lastCandleLowPrice = lowPrice;
        this.state.candles.setLastLowCandlePrice(lowPrice);
      }
      const orderLinkId = String(Date.now());
      const body: OrderParamsV5 = {
        symbol: symbol,
        side: 'Buy',
        orderType: 'Limit',
        qty,
        price: lastCandleLowPrice,
        category,
        orderLinkId,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      this.state.trades.addToOrdBook(orderLinkId, 'OPEN_ORDER');
      const ordResponse = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|submitOrder|${JSON.stringify(ordResponse)}|`);
      const {retCode} = ordResponse;

      if (retCode !== 0) {
        this.emitter.emit(ERROR_EVENT, ordResponse);
      }
      return {data: ordResponse, error: null};
    } catch (error) {
      return {error: (error as Error).message, data: null};
    }
  }
}
