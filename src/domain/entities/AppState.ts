import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {CANCEL_ORDER, REOPEN_TIMER} from '../../constants';
import {CandleStick} from './CandleStick';
import {OrderBook} from './OrderBook';
import {Options} from './Options';
import {Position} from './Position';

@injectable()
export class AppState {
  private timer: NodeJS.Timer | undefined;
  private _status = 'STOPPED';

  get status() {
    return this._status;
  }

  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('CandleStick')
    private readonly orderBook: OrderBook,
    @inject('Options')
    private readonly options: Options,
    @inject('Position')
    private readonly position: Position
  ) {}

  get canOpenAvgOrder(): boolean {
    return (
      !this.orderBook.isAvgOrderExists &&
      this.candle.count >= this.options.minCandles &&
      this.position.exists &&
      this.orderBook.avgOrderCount <= this.options.maxAvgCount &&
      this._status !== 'STOPPED'
    );
  }

  get canOpenPositionOrder() {
    return (
      this.orderBook.profitTakesCount < this.options.tradeCycles &&
      !this.position.exists &&
      !this.position.partiallyFilled &&
      this._status !== 'STOPPED'
    );
  }

  get canOpenProfitOrder() {
    return this._status !== 'STOPPED';
  }

  resetReopenTimer = () => {
    clearTimeout(this.timer);
  };

  reopenProfitOrder = () => {
    this.resetReopenTimer();
    this.timer = setTimeout(() => {
      this.emitter.emit(CANCEL_ORDER, 'TAKE_PROFIT_ORDER');
    }, REOPEN_TIMER); // TODO: add reopen profit take
  };

  stop = () => {
    this._status = 'STOPPED';
  };

  start = () => {
    this._status = 'ACTIVE';
  };

  finishAndStop = () => {
    this._status = 'WAIT_AND_STOP';
  };
}
