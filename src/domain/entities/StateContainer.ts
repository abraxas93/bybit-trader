import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {TradeState} from './TradeState';
import {CandleState} from './CandleState';
import {Options} from './Options';
import {LOG_EVENT} from '../../constants';

@injectable()
export class StateContainer {
  constructor(
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter,
    @inject('TradeState')
    public readonly trades: TradeState,
    @inject('CandleState')
    public readonly candles: CandleState,
    @inject('Options')
    public readonly options: Options
  ) {}

  get canOpenAvgOrder(): boolean {
    return (
      !this.trades.isAvgOrderExists &&
      this.candles.count >= this.options.minCandles &&
      this.trades.isPositionExists &&
      this.trades.avgOrderCount <= this.options.maxAvgCount
    );
  }

  public getSnapshot = (label: string) => {
    const snapshot = {
      label,
      posQty: this.trades.posQty,
      avgQty: this.trades.avgQty,
      currentLowPrice: this.candles.currentLowPrice,
      lastCandleLowPrice: this.candles.lastCandleLowPrice,
      avgPosPrice: this.trades.avgPosPrice,
      lastAvgOrderPrice: this.trades.lastAvgOrderPrice,
      avgOrderCount: this.trades.avgOrderCount,
      avgOrderPrice: this.trades.avgOrderPrice,
      profitOrderPrice: this.trades.profitOrderPrice,
      canOpenAvgOrder: this.canOpenAvgOrder,
      isNewCandle: this.candles.isNewCandle,
      isAvgOrderExists: this.trades.isAvgOrderExists,
      isPositionOpened: this.trades.isPositionExists,
      nextCandleIn: this.candles.nextCandleIn,
      candlesCount: this.candles.count,
      quantity: this.trades.quantity,
      orderBook: this.trades.orderBook,
      klineStarted: this.candles.klineStarted,
    };
    return snapshot;
  };

  openPosition = (avgPrice: string, qty: string) => {
    this.trades.openPosOrder(avgPrice, qty);
    this.candles.resetCandlesCount();
    this._emitter.emit(LOG_EVENT, 'openPosition');
  };
}
