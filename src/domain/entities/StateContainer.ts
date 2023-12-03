import {inject, injectable} from 'tsyringe';
import BigJs from 'big.js';
import {EventEmitter} from 'events';
import {OrderBook} from './OrderBook';
import {CandleState} from './CandleStick';
import {Options} from './Options';
import {LOG_EVENT, CANCEL_ORDER, REOPEN_TIMER} from '../../constants';
import {Position} from './Position';

@injectable()
export class StateContainer {
  private _timer: NodeJS.Timer | undefined;
  private _pause = false;
  constructor(
    @inject('EventEmitter')
    private readonly _emitter: EventEmitter,
    @inject('OrderBook')
    public readonly trades: OrderBook,
    @inject('CandleStick)
    public readonly candles: CandleState,
    @inject('Options')
    public readonly options: Options,
    @inject('Position')
    public readonly position: Position
  ) {}

  get canOpenAvgOrder(): boolean {
    return (
      !this.trades.isAvgOrderExists &&
      this.candles.count >= this.options.minCandles &&
      this.trades.isPositionExists &&
      this.trades.avgOrderCount <= this.options.maxAvgCount
    );
  }

  public pause = () => {
    this._pause = true;
  };

  public unpause = () => {
    this._pause = false;
  };

  setLimitLongOrderFilled = (avgPrice: string, qty: string) => {
    this.trades.isPositionExists = true;
    this.trades.setBaseQty(qty);
    this.position.avgPosPrice = avgPrice;
    this.position.lastAvgOrderPrice = avgPrice;
    this.candles.resetCandlesCount();
    this._emitter.emit(LOG_EVENT, 'openPosition');
  };

  setLimitShortOrderFilled = () => {
    this.trades.isPositionExists = false;
    this.trades.isAvgOrderExists = false;
    this.trades.clearQty();
    this.trades.incProfitTakeCount();
    this.trades.avgOrderCount = 0;
    this.position.avgPosPrice = '0';
    this.position.lastAvgOrderPrice = '0';
    this._emitter.emit(LOG_EVENT, 'setLimitShortOrderFilled');
  };

  submitLimitAvgOrder = (orderLinkId: string) => {
    this.trades.isAvgOrderExists = true;
    this.trades.addToOrdBook(orderLinkId, 'AVERAGE_ORDER');
    this._emitter.emit(LOG_EVENT, 'submitLimitAvgOrder');
  };

  public partiallyFillAvgOrder = (qty: string, value: string) => {
    const index = this.trades.avgOrderCount + 1;
    this.position.partiallyFillAvgOrder(index, qty, value);
  };

  setLimitAvgOrderFilled = (price: string, qty: string, value: string) => {
    this.trades.isAvgOrderExists = false;
    this.partiallyFillAvgOrder(qty, value);
    this.position.lastAvgOrderPrice = price;
    this.trades.incAvgOrderCount();

    this.candles.resetCandlesCount();
    this.resetReopenTimer();

    this._emitter.emit(LOG_EVENT, 'setLimitAvgOrderFilled');
  };

  cancelLimitAvgOrder = (orderId: string) => {
    this.trades.isAvgOrderExists = false;
    this.trades.removeFromOrdBook(orderId, false);
    this._emitter.emit(LOG_EVENT, 'cancelAvgOrder');
  };

  resetReopenTimer = () => {
    clearTimeout(this._timer);
  };

  reopenProfitOrder = () => {
    this.resetReopenTimer();
    this._timer = setTimeout(() => {
      this._emitter.emit(CANCEL_ORDER);
    }, REOPEN_TIMER);
  };
}
