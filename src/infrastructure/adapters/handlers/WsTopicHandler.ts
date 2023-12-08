import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {OrderData, TickerData, Topic} from '../../../types';
import {log} from '../../../utils';

import {CandleStick, OrderBook, Position} from '../../../domain/entities';
import {
  FilledAvgOrder,
  FilledProfitOrder,
  PartiallyFilledAvgOrder,
  FilledOpenOrder,
} from '../../../application';

@injectable()
export class WsTopicHandler {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('Position')
    private readonly position: Position,
    @inject('FilledOpenOrder')
    private readonly filledOpenOrder: FilledOpenOrder,
    @inject('FilledProfitOrder')
    private readonly filledProfitOrder: FilledProfitOrder,
    @inject('FilledAvgOrder')
    private readonly filledAvgOrder: FilledAvgOrder,
    @inject('PartiallyFilledAvgOrder')
    private readonly partFilledAvgOrder: PartiallyFilledAvgOrder
  ) {}

  handle(socketData: Topic) {
    const {topic, data, ts} = socketData;

    if (topic === 'order') {
      const [orderData] = data;
      log.orders.info(JSON.stringify(orderData));
      const {orderStatus, avgPrice, cumExecQty, cumExecValue, orderLinkId} =
        orderData as OrderData;
      const orderCls = this.orderBook.getOrderClass(orderLinkId);

      if (orderCls === 'OPEN_ORDER' && orderStatus === 'Filled') {
        this.filledOpenOrder.execute({avgPrice, cumExecQty, orderLinkId});
      }

      if (orderCls === 'OPEN_ORDER' && orderStatus === 'PartiallyFilled') {
        this.position.partiallyFilled = true;
      }

      if (orderCls === 'TAKE_PROFIT_ORDER' && orderStatus === 'Filled') {
        this.filledProfitOrder
          .execute()
          .catch(err => log.errs.error(JSON.stringify(err)));
      }

      if (orderCls === 'AVERAGE_ORDER' && orderStatus === 'Filled') {
        this.filledAvgOrder
          .execute({orderLinkId, avgPrice, cumExecQty, cumExecValue})
          .catch(err => log.errs.error(JSON.stringify(err)));
      }

      if (orderCls === 'AVERAGE_ORDER' && orderStatus === 'PartiallyFilled') {
        this.partFilledAvgOrder.execute({cumExecQty, cumExecValue});
      }

      if (
        orderCls === 'TAKE_PROFIT_ORDER' &&
        orderStatus === 'PartiallyFilled'
      ) {
        this.position.handlePartiallyFilledProfitOrder(cumExecQty);
      }
    }

    if (topic.includes('tickers')) {
      const {lastPrice, bid1Price, ask1Price} = data as unknown as TickerData;
      this.position.bid1Price = bid1Price;
      this.position.ask1Price = ask1Price;
      this.position.lastPrice = lastPrice;
      this.candle.updateLowPrice(lastPrice);
      this.candle.countTick(ts);
    }
  }
}
