/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {USER} from '../../config';
import {
  AppState,
  CandleStick,
  Options,
  OrderBook,
  Position,
} from '../../domain/entities';

const label = 'AppWaitAndStop';
@injectable()
export class AppWaitAndStop {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
    try {
      this.state.finishAndStop();
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          'MESSAGE=App will pause after finish current trade'
        )
        .catch(err => log.errs.error(err));
    } catch (error) {
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          `APP_WAIT_AND_STO=${(error as Error).message}`
        )
        .catch(err => log.errs.error(err));
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  };
}
