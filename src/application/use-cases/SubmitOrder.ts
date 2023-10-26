import {OrderClass, Store} from '../../domain/entities/Store';
import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';

type SubmitOrderParams = OrderParamsV5 & {
  orderClass: OrderClass;
};

@injectable()
export class SubmitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Store')
    private readonly store: Store
  ) {}

  async execute(data: SubmitOrderParams) {
    try {
      const {orderClass, ...body} = data;
      const ordResponse = await this.client.submitOrder(body);
      const {retCode, result} = ordResponse;
      if (retCode === 0) {
        this.store.addOrder(result.orderId, orderClass);
      }
      return {data: ordResponse, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
