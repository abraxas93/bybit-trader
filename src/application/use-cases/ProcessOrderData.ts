import {EventEmitter} from 'events';
import {OrderData} from '../../types';
import {Store} from '../../domain/entities/Store';
import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {
  ERROR_EVENT,
  SUBMIT_OPEN_ORDER,
  SUBMIT_PROFIT_ORDER,
} from '../../constants';

@injectable()
export class ProcessOrderData {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Store')
    private readonly store: Store,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  private async cancelAvgOrder() {
    const symbol = this.store.symbol;
    const category = this.store.category;

    const orderId = this.store.getOrderIdbyClass('AVERAGE_ORDER');
    if (orderId) {
      const cancelResponse = await this.client.cancelAllOrders({
        category,
        symbol,
      });
      this.store.isAverageOrderOpened = false;
      this.store.removeOrder(orderId);

      if (!cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }
    }
  }

  private async cancelTakeProfitOrder() {
    const symbol = this.store.symbol;
    const category = this.store.category;
    const orderId = this.store.getOrderIdbyClass('TAKE_PROFIT_ORDER');
    if (orderId) {
      const cancelResponse = await this.client.cancelAllOrders({
        category,
        symbol,
      });

      if (!cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }

      this.store.removeOrder(orderId);
    }
  }
  // TODO: add paritally filled cases
  async execute(data: OrderData) {
    try {
      const {
        orderId,
        orderStatus,
        avgPrice,
        cumExecQty,
        cumExecValue,
        lastExecQty,
      } = data;
      const orderCls = this.store.getOrderClass(orderId);
      console.log({orderId, orderStatus, lastExecQty});
      if (orderStatus === 'Filled') {
        this.store.removeOrder(orderId);
      }

      if (orderCls === 'OPEN_ORDER' && orderStatus === 'Filled') {
        this.store.openPosition(avgPrice, cumExecQty);
        return {data: SUBMIT_PROFIT_ORDER, error: null};
      }

      if (orderCls === 'TAKE_PROFIT_ORDER' && orderStatus === 'Filled') {
        this.store.closePosition();
        await this.cancelAvgOrder(); // TODO: add error handling
        return {data: SUBMIT_OPEN_ORDER, error: null};
      }

      if (orderCls === 'AVERAGE_ORDER' && orderStatus === 'Filled') {
        this.store.closeAvgOrder(avgPrice, cumExecQty, cumExecValue);
        await this.cancelTakeProfitOrder(); // TODO: add error handling
        return {data: SUBMIT_PROFIT_ORDER, error: null};
      }

      return {data: null, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
