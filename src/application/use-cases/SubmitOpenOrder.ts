import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {Store} from '../../domain/entities/Store';
import {ERROR_EVENT, SUBMIT_OPEN_ORDER} from '../../constants';
import {initLogger} from '../../utils/logger';

const apiLogger = initLogger('SubmitOpenOrder', 'logs/api.log');

@injectable()
export class SubmitOpenOrder {
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
      const symbol = this.store.symbol;
      const category = this.store.category;
      const qty: string = this.store.baseQty;
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

      let lastCandleLowPrice = this.store.lastCandleLowPrice;

      if (lastCandleLowPrice === '0') {
        apiLogger.info(`REQUEST|getKline|${symbol} ${category} 1|`);
        const response = await this.client.getKline({
          category: category,
          symbol: symbol,
          interval: '1',
        });
        apiLogger.info(`RESPONSE|getKline|${JSON.stringify(response)}|`);
        const [, , , , lowPrice] = response.result.list[0];
        lastCandleLowPrice = lowPrice;
        this.store.setLastLowCandlePrice(lowPrice);
      }

      const body: OrderParamsV5 = {
        symbol: symbol,
        side: 'Buy',
        orderType: 'Limit',
        qty,
        price: lastCandleLowPrice,
        category: category,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const ordResponse = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|getKline|${JSON.stringify(ordResponse)}|`);
      const {retCode, result} = ordResponse;

      if (retCode === 0) {
        this.store.addOrder(result.orderId, 'OPEN_ORDER');
      }
      return {data: ordResponse, error: null};
    } catch (error) {
      return {error: (error as Error).message, data: null};
    }
  }
}
