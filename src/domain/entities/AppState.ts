import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {CANCEL_ORDER, REOPEN_TIMER} from '../../constants';
import {CandleStick} from './CandleStick';
import {OrderBook} from './OrderBook';
import {Options} from './Options';
import {Position} from './Position';
import {Redis} from 'ioredis';
import {ENV, USER} from '../../config';
import {APP_STATUS} from '../../keys';
import {log} from '../../utils';

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
    private readonly position: Position,
    @inject('Redis')
    private readonly redis: Redis
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
    clearTimeout(this.timer);
  };

  reopenProfitOrder = () => {
    this.resetReopenTimer();
    this.timer = setTimeout(() => {
      this.emitter.emit(CANCEL_ORDER, 'Sell');
    }, REOPEN_TIMER); // TODO: add reopen profit take
  };

  stop = () => {
    this._status = 'STOPPED';
    this.redis
      .set(`${USER}:${ENV}:${APP_STATUS}`, 'STOPPED')
      .catch(err => log.errs.error(err));
  };

  start = () => {
    this._status = 'ACTIVE';
    this.redis
      .set(`${USER}:${ENV}:${APP_STATUS}`, 'ACTIVE')
      .catch(err => log.errs.error(err));
  };

  pause = () => {
    this._status = 'PAUSED';
    this.redis
      .set(`${USER}:${ENV}:${APP_STATUS}`, 'PAUSED')
      .catch(err => log.errs.error(err));
  };

  finishAndStop = () => {
    this._status = 'WAIT_AND_STOP';
    this.redis
      .set(`${USER}:${ENV}:${APP_STATUS}`, 'WAIT_AND_STOP')
      .catch(err => log.errs.error(err));
  };
}
