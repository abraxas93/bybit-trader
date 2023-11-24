import {EventEmitter} from 'events';
import {OrderData} from '../../types';
import {RestClientV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {
  ERROR_EVENT,
  SUBMIT_OPEN_ORDER,
  SUBMIT_PROFIT_ORDER,
} from '../../constants';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('ProcessOrderData', 'logs/api.log');

@injectable()
export class ProcessOrderData {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  private async cancelAvgOrder() {
    const symbol = this.state.options.symbol;
    const category = this.state.options.category;

    const orderId = this.state.trades.getOrderIdbyClass('AVERAGE_ORDER');
    if (orderId) {
      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );
      this.state.trades.clearOrderBook();
      if (cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }
    }
  }

  private async cancelTakeProfitOrder() {
    const symbol = this.state.options.symbol;
    const category = this.state.options.category;
    const orderId = this.state.trades.getOrderIdbyClass('TAKE_PROFIT_ORDER');
    if (orderId) {
      apiLogger.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      apiLogger.info(
        `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );
      if (cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }

      this.state.trades.clearOrderBook();
    }
  }
  // TODO: add paritally filled cases
  async execute(data: OrderData) {
    try {
      const {orderId, orderStatus, avgPrice, cumExecQty, cumExecValue} = data;
      const orderCls = this.state.trades.getOrderClass(orderId);

      if (orderStatus === 'Filled') {
        this.state.trades.removeFromOrdBook(orderId);
      }

      if (orderCls === 'OPEN_ORDER' && orderStatus === 'Filled') {
        this.state.openPosition(avgPrice, cumExecQty);
        // check or another open position order exists and cancel exactly it
        return {data: SUBMIT_PROFIT_ORDER, error: null};
      }

      if (orderCls === 'TAKE_PROFIT_ORDER' && orderStatus === 'Filled') {
        this.state.trades.closePosOrder();
        await this.cancelAvgOrder(); // TODO: add error handling
        return {data: SUBMIT_OPEN_ORDER, error: null};
      }

      if (orderCls === 'AVERAGE_ORDER' && orderStatus === 'Filled') {
        this.state.trades.closeAvgOrder(avgPrice, cumExecQty, cumExecValue);
        this.state.candles.resetCandlesCount();
        this.state.resetReopenTimer();
        await this.cancelTakeProfitOrder(); // TODO: add error handling
        return {data: SUBMIT_PROFIT_ORDER, error: null};
      }

      if (orderCls === 'AVERAGE_ORDER' && orderStatus === 'PartiallyFilled') {
        // update quantity
        this.state.trades.partiallyFillAvgOrder(cumExecQty, cumExecValue);
        this.state.reopenProfitOrder();
      }

      if (
        orderCls === 'TAKE_PROFIT_ORDER' &&
        orderStatus === 'PartiallyFilled'
      ) {
        this.state.trades.deductQty(cumExecQty);
      }
      return {data: null, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
