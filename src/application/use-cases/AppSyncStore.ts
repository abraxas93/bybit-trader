/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {USER} from '../../config';
import {Options, OrderBook, Position} from '../../domain/entities';

const label = 'AppSyncStore';
@injectable()
export class AppSyncStore {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('Position')
    private readonly position: Position,
    @inject('OrderBook')
    private readonly orderBook: OrderBook
  ) {}

  execute = async () => {
    try {
      await this.position.loadVars();
      await this.orderBook.loadVars();
      await this.redis
        .publish(`${USER}:RESPONSE`, 'MESSAGE=Application update store vars')
        .catch(err => log.errs.error(err));
    } catch (error) {
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          `APP_SYNC_STORE=${(error as Error).message}`
        )
        .catch(err => log.errs.error(err));
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  };
}
