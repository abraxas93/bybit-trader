import {inject, injectable} from 'tsyringe';
import {CandleStick} from './CandleStick';
import {OrderBook} from './OrderBook';
import {Position} from './Position';

@injectable()
export class SnapshotBuilder {
  constructor(
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly position: Position
  ) {}

  private getCandleSnapshot() {
    const data = {
      candles: this.candle.candles,
      isNewCandle: this.candle.isNewCandle,
      currentLowPrice: this.candle.currentLowPrice,
      lastCandleLowPrice: this.candle.lastCandleLowPrice,
      nextCandleIn: this.candle.nextCandleIn,
      count: this.candle.count,
    };
    return JSON.stringify(data);
  }

  private getOrderBookSnapshot() {
    const data = {
      orders: this.orderBook.orderBook,
      isAvgOrderExists: this.orderBook.isAvgOrderExists,
      avgOrderCount: this.orderBook.isAvgOrderExists,
      profitTakesCount: this.orderBook.profitTakesCount,
    };
    return JSON.stringify(data);
  }

  private getPosition() {
    const data = {
      lastPrice: this.position.lastPrice,
      bid1Price: this.position.bid1Price,
      ask1Price: this.position.ask1Price,
      posQty: this.position.posQty,
      avgQty: this.position.avgQty,
      lastAvgOrderPrice: this.position.lastAvgOrderPrice,
      avgPosPrice: this.position.avgPosPrice,
      avgOrderPrice: this.position.avgOrderPrice,
      profitOrderPrice: this.position.profitOrderPrice,
      exists: this.position.exists,
    };
    return JSON.stringify(data);
  }

  getStateSnapshot(type: string) {
    if (type === 'candle') return this.getCandleSnapshot();
    if (type === 'orderBook') return this.getOrderBookSnapshot();
    if (type === 'position') return this.getPosition();
    return '';
  }
}
