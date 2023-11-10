import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {SubmitOrderParams, Topic} from '../../../types';
import {Store} from '../../../domain/entities/Store';
import {OPEN_POSITION, SUBMIT_ORDER} from '../../../constants';
import {RestClientV5} from 'bybit-api';

type OrderData = {
  orderId: string;
  avgPrice: string;
  orderStatus: string;
  lastPrice?: string;
};

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
        this.emitter.emit(OPEN_POSITION, params);
      }

      if (orderClass === 'AVERAGE_ORDER' && orderStatus === 'Filled') {
        this.store.recalcAvgPrice(avgPrice);
        this.store.setAvgOrderFilled();

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
        this.store.removeOrder(orderId);
      }
    }

    if (topic.includes('tickers')) {
      const {lastPrice} = data as unknown as OrderData;
      this.store.setLowPrice(lastPrice);
      this.store.setLastCandleLowPrice(ts);
    }
  };
}
