import {Store} from '../../domain/entities/Store';
import {GetKlineParamsV5, OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';

@injectable()
export class OpenStartPosition {
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

      const request: GetKlineParamsV5 = {
        category: category,
        symbol: symbol,
        interval: '1',
      };

      const response = await this.client.getKline(request);
      const [, , , , lowPrice] = response.result.list[0];

      const order: OrderParamsV5 = {
        symbol: symbol,
        side: 'Buy',
        orderType: 'Limit',
        qty,
        price: lowPrice,
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
