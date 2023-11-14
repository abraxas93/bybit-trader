import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {Store} from '../../domain/entities/Store';
import {ERROR_EVENT, SUBMIT_OPEN_ORDER} from '../../constants';
import {initLogger} from '../../logger';

const logger = initLogger(__filename);

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
      logger.info(SUBMIT_OPEN_ORDER);
      const symbol = this.store.symbol;
      const category = this.store.category;
      const qty: string = this.store.baseQty;
      const cancelResponse = await this.client.cancelAllOrders({
        symbol,
        category,
      });

      if (cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }

      let lastCandleLowPrice = this.store.lastCandleLowPrice;

      if (lastCandleLowPrice === '0') {
        const response = await this.client.getKline({
          category: category,
          symbol: symbol,
          interval: '1',
        });
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
      console.log(body);
      const ordResponse = await this.client.submitOrder(body);

      const {retCode, result} = ordResponse;
      logger.warn(ordResponse);
      if (retCode === 0) {
        this.store.addOrder(result.orderId, 'OPEN_ORDER');
      }
      return {data: ordResponse, error: null};
    } catch (error) {
      return {error: (error as Error).message, data: null};
    }
  }
}
