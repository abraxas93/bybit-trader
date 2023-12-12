/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {ENV, USER} from '../../config';
import {Options, OrderBook, Position} from '../../domain/entities';

const label = 'AppSwitchSymbol';
@injectable()
export class AppSwitchSymbol {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('Position')
    private readonly position: Position,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Options')
    private readonly options: Options
  ) {}

  execute = async (newSymbol: string) => {
    try {
      const symbol = await this.redis.get(`${USER}:${ENV}:SYMBOL`);
      if (symbol === newSymbol) return;
      await this.redis.set(`${USER}:${ENV}:SYMBOL`, newSymbol);
      await this.position.loadVars();
      await this.orderBook.loadVars();
      await this.options.loadVars(newSymbol);
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          '*ByBitTrader:* switch symbolt to \\-' + newSymbol
        )
        .catch(err => log.errs.error(err));
    } catch (error) {
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          `*ByBitTrader:* ${(error as Error).message}`
        )
        .catch(err => log.errs.error(err));
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
