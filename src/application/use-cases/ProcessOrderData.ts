import {EventEmitter} from 'events';
import {OrderData} from '../../types';
import {Store} from '../../domain/entities/Store';
import {CategoryV5, RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT, SUBMIT_PROFIT_ORDER} from '../../constants';
import {initLogger} from '../../utils/logger';

const apiLogger = initLogger('ProcessOrderData', 'logs/api.log');

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
    const symbol = this.store.options.symbol;
    const category = this.store.options.category;

    const orderId = this.store.getOrderIdbyClass('AVERAGE_ORDER');
    if (orderId) {
      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        category: category as CategoryV5,
        symbol,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );
      this.store.isAverageOrderOpened = false;
      this.store.removeOrder(orderId);

      if (!cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }
    }
  }

  private async cancelTakeProfitOrder() {
    const symbol = this.store.options.symbol;
    const category = this.store.options.category;
    const orderId = this.store.getOrderIdbyClass('TAKE_PROFIT_ORDER');
    if (orderId) {
      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        category: category as CategoryV5,
        symbol,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );
      if (!cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }

      this.store.removeOrder(orderId);
    }
  }
  // TODO: add paritally filled cases
  async execute(data: OrderData) {
    try {
      const {orderId, orderStatus, avgPrice, cumExecQty, cumExecValue} = data;
      const orderCls = this.store.getOrderClass(orderId);

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
        // return {data: SUBMIT_OPEN_ORDER, error: null};
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
