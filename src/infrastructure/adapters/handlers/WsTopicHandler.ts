import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {OrderData, SubmitOrderParams, TickerData, Topic} from '../../../types';
import {Store} from '../../../domain/entities/Store';
import {SUBMIT_ORDER} from '../../../constants';
import {RestClientV5} from 'bybit-api';

@injectable()
export class WsTopicHandler {
  constructor(
    @inject('Store')
    private readonly store: Store,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5
  ) {}

  processTopic = async (socketData: Topic) => {
    const {topic, data, ts} = socketData;
    // console.log(socketData);
    if (topic === 'order') {
      const [orderData] = data;

      const {orderId, avgPrice, orderStatus} = orderData as OrderData;
      const orderClass = this.store.getOrderClass(orderId);
      console.log({orderClass, orderId, orderStatus, avgPrice});

      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.quantity;

      if (orderClass === 'OPEN_ORDER' && orderStatus === 'Filled') {
        this.store.recalcAvgPrice(avgPrice);
        this.store.isPositionOpened = true;

        const params: SubmitOrderParams = {
          symbol,
          orderClass: 'TAKE_PROFIT_ORDER',
          qty,
          side: 'Sell',
          orderType: 'Limit',
          price: String(this.store.getTakeProfitOrderPrice()),
          category: category,
        };
        this.emitter.emit(SUBMIT_ORDER, params);
      }

      if (orderClass === 'TAKE_PROFIT_ORDER' && orderStatus === 'Filled') {
        const lastCandleLowPrice = this.store.getLastCandleLowPrice();
        this.store.resetAvgPrice();

        const orderId = this.store.getOrderIdbyClass('AVERAGE_ORDER');
        if (orderId) {
          await this.client.cancelOrder({orderId, category, symbol});
          this.store.isAverageOrderOpened = false;
        }

        this.store.isPositionOpened = false;

        const params: SubmitOrderParams = {
          symbol,
          orderClass: 'OPEN_ORDER',
          qty,
          side: 'Buy',
          orderType: 'Limit',
          price: String(lastCandleLowPrice),
          category: category,
        };
        this.emitter.emit(SUBMIT_ORDER, params);
      }

      if (orderClass === 'AVERAGE_ORDER' && orderStatus === 'Filled') {
        this.store.recalcAvgPrice(avgPrice);
        this.store.isAverageOrderOpened = false;

        const orderId = this.store.getOrderIdbyClass('TAKE_PROFIT_ORDER');
        if (orderId) {
          await this.client.cancelOrder({orderId, category, symbol});
        }

        const params: SubmitOrderParams = {
          symbol,
          orderClass: 'TAKE_PROFIT_ORDER',
          qty,
          side: 'Sell',
          orderType: 'Limit',
          price: String(this.store.getTakeProfitOrderPrice()),
          category: category,
        };
        this.emitter.emit(SUBMIT_ORDER, params);
      }

      if (orderStatus === 'Filled') {
        // TODO: should remove order when cancel it
        this.store.removeOrder(orderId);
      }
    }

    if (topic.includes('tickers')) {
      const {lastPrice} = data as unknown as TickerData;
      this.store.setLowPrice(lastPrice);
      this.store.setLastCandleLowPrice(ts);
    }
  };
}
