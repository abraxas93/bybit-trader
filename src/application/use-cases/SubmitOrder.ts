import {SubmitOrderParams} from '../../types';
import {Store} from '../../domain/entities/Store';
import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';

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
      console.log('Submit, ', data);
      const {orderClass, ...body} = data;
      const ordResponse = await this.client.submitOrder(body);
      const {retCode, result} = ordResponse;
      console.log('Response, ', ordResponse);
      if (retCode === 0) {
        this.store.addOrder(result.orderId, orderClass);
        if (orderClass === 'AVERAGE_ORDER') {
          this.store.isAverageOrderOpened = true;
        }
      }
      return {data: ordResponse, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
