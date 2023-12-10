/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {USER} from '../../config';
import {Options} from '../../domain/entities';

const label = 'AppSyncConfig';
@injectable()
export class AppSyncConfig {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('Options')
    private readonly options: Options
  ) {}

  execute = async () => {
    try {
      await this.options.loadVars();
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          '*ByBitTrader:* Application update config vars'
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
        data: JSON.stringify(error),
      });
    }
  };
}
