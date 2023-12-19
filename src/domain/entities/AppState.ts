import {inject, injectable} from 'tsyringe';
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
    @inject('CandleStick')
    public readonly candle: CandleStick,
    @inject('OrderBook')
    public readonly orderBook: OrderBook,
    @inject('Options')
    public readonly options: Options,
    @inject('Position')
    public readonly position: Position,
    @inject('Redis')
    public readonly redis: Redis
  ) {}

  get canOpenAvgOrder(): boolean {
    return (
      !this.orderBook.isAvgOrderExists &&
      this.candle.count >= this.options.minCandles &&
      this.position.exists &&
      this.orderBook.avgOrderCount <= this.options.maxAvgCount &&
      (this._status === 'ACTIVE' || this._status == 'WAIT_AND_STOP')
    );
  }

  get canOpenPositionOrder() {
    return (
      this.orderBook.profitTakesCount < this.options.tradeCycles &&
      !this.position.exists &&
      !this.position.partiallyFilled &&
      (this._status === 'ACTIVE' || this._status == 'WAIT_AND_STOP')
    );
  }

  get canOpenProfitOrder() {
    return this._status === 'ACTIVE' || this._status == 'WAIT_AND_STOP';
  }

  resetReopenTimer = () => {
    clearTimeout(this.timer);
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

  setAmmendAvgOrdTimer = (id: NodeJS.Timeout) => {
    this.timer = id;
  };

  // ammendAvgOrder = () => {
  //   this.resetReopenTimer();
  //   this.timer = setTimeout(() => {
  //     this.emitter.emit(CANCEL_ORDER, 'Buy');
  //   }, REOPEN_TIMER);
  // };
}
