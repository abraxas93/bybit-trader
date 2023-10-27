import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {Topic} from '../../../types';
import {Store} from '../../../domain/entities/Store';
import {NOT_IMPLEMENTED, OPEN_POSITION, SUBMIT_ORDER} from '../../../constants';

type OrderData = {
  orderId: string;
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
      const {orderId} = orderData as OrderData;
      const orderClass = this.store.getOrderClass(orderId);
      if (!orderClass) throw new Error(NOT_IMPLEMENTED);

      this.store.removeOrder(orderId);

      if (orderClass === 'OPEN_ORDER') {
        this.emitter.emit(SUBMIT_ORDER, {});
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
