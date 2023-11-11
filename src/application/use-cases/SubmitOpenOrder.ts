import {Store} from '../../domain/entities/Store';
import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';

@injectable()
export class SubmitOpenOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Store')
    private readonly store: Store
  ) {}
  async execute() {
    try {
      const symbol = this.store.symbol;
      const category = this.store.category;
      const qty = this.store.quantity;
      let lastCandleLowPrice = this.store.lastCandleLowPrice;

      if (lastCandleLowPrice === '0') {
        const response = await this.client.getKline({
          category: category,
          symbol: symbol,
          interval: '1',
        });
        const [, , , , lowPrice] = response.result.list[0];
        lastCandleLowPrice = lowPrice;
      }

      const order: OrderParamsV5 = {
        symbol: symbol,
        side: 'Buy',
        orderType: 'Limit',
        qty,
        price: lastCandleLowPrice,
        category: category,
      };
      const ordResponse = await this.client.submitOrder(order);
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
