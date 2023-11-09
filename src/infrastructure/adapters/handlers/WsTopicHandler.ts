import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {SubmitOrderParams, Topic} from '../../../types';
import {Store} from '../../../domain/entities/Store';
import {NOT_IMPLEMENTED, OPEN_POSITION, SUBMIT_ORDER} from '../../../constants';

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
    private readonly emitter: EventEmitter
  ) {}

  processTopic = (socketData: Topic) => {
    const {topic, data, ts} = socketData;
    if (topic === 'order') {
      const [orderData] = data;

      const {orderId, avgPrice, orderStatus} = orderData as OrderData;
      const orderClass = this.store.getOrderClass(orderId);

      if (!orderClass) throw new Error(NOT_IMPLEMENTED);

      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.quantity;
      if (orderClass === 'OPEN_ORDER' && orderStatus === 'Filled') {
        this.store.recalcAvgPrice(avgPrice);
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
        // cancel average order
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

      this.store.removeOrder(orderId);
    }

    if (topic.includes('tickers')) {
      const {lastPrice} = data as unknown as OrderData;
      this.store.setLowPrice(lastPrice);
      this.store.setLastCandleLowPrice(ts);
    }
  };
}
