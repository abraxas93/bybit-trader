import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {CANCEL_ORDER, REOPEN_TIMER} from '../../constants';
import {CandleStick} from './CandleStick';
import {OrderBook} from './OrderBook';
import {Options} from './Options';
import {Position} from './Position';

type AppStatus = 'STOPPED' | 'ACTIVE' | 'PAUSED' | 'WAIT_AND_STOP';

@injectable()
export class AppState {
  private timer: NodeJS.Timeout | undefined;
  private _status: AppStatus = 'STOPPED';

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
      this._status === 'ACTIVE'
    );
  }

  get canOpenPositionOrder() {
    return (
      this.orderBook.profitTakesCount < this.options.tradeCycles &&
      !this.position.exists &&
      !this.position.partiallyFilled &&
      this._status === 'ACTIVE'
    );
  }

  get canOpenProfitOrder() {
    return this._status === 'ACTIVE';
  }

  resetReopenTimer = () => {
    clearTimeout(this.timer as NodeJS.Timeout);
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

  pause = () => {
    this._status = 'PAUSED';
  };

  finishAndStop = () => {
    this._status = 'WAIT_AND_STOP';
  };
}
