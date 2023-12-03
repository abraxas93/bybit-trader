import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {CandleStick, OrderBook, Position} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT, OPEN_ORDER_FILLED} from '../../constants';

const label = 'FilledOpenOrder';

@injectable()
export class FilledOpenOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly position: Position
  ) {}

  execute({
    avgPrice,
    cumExecQty,
    orderLinkId,
  }: {
    avgPrice: string;
    cumExecQty: string;
    orderLinkId: string;
  }) {
    try {
      this.position.fillLongOrder(cumExecQty, avgPrice);
      this.candle.resetCandlesCount();
      this.orderBook.removeFromOrdBook(orderLinkId);

      this.emitter.emit(OPEN_ORDER_FILLED);
      this.emitter.emit(LOG_EVENT, label);
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  }
}
