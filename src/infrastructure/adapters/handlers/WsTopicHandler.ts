import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {SubmitOrderParams, Topic} from '../../../types';
import {Store} from '../../../domain/entities/Store';
import {NOT_IMPLEMENTED, OPEN_POSITION, SUBMIT_ORDER} from '../../../constants';

type OrderData = {
  orderId: string;
  avgPrice: string;
};

@injectable()
export class WsTopicHandler {
  constructor(
    @inject('Store')
    private readonly store: Store,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}
  processTopic(socketData: Topic) {
    const {topic, data} = socketData;

    if (topic === 'order') {
      const [orderData] = data;
      const {orderId, avgPrice} = orderData as OrderData;
      const orderClass = this.store.getOrderClass(orderId);
      if (!orderClass) throw new Error(NOT_IMPLEMENTED);

      this.store.removeOrder(orderId);
      const category = this.store.category;
      const symbol = this.store.symbol;
      const qty = this.store.quantity;
      if (orderClass === 'OPEN_ORDER') {
        const params: SubmitOrderParams = {
          symbol,
          orderClass: 'TAKE_PROFIT_ORDER',
          qty,
          side: 'Sell',
          orderType: 'Limit',
          price: String(Number(avgPrice) + Number(avgPrice) * 0.05),
          category: category,
        };
        this.emitter.emit(SUBMIT_ORDER, params);
      }

      if (orderClass === 'TAKE_PROFIT_ORDER') {
        this.emitter.emit(OPEN_POSITION, {});
      }

      if (orderClass === 'AVERAGE_ORDER') {
        this.emitter.emit(SUBMIT_ORDER, {});
      }
    }
  }
}
