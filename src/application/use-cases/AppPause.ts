import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {AppState} from '../../domain/entities';
import {USER} from '../../config';

const label = 'AppPause';
@injectable()
export class AppPause {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
    try {
      this.state.pause();
      await this.state.redis
        .publish(`${USER}:RESPONSE`, '*ByBitTrader:* application paused')
        .catch(err => log.errs.error(err));
    } catch (error) {
      await this.state.redis
        .publish(`${USER}:RESPONSE`, `${(error as Error).message}`)
        .catch(err => log.errs.error((err as Error).message));
    }
  };
}
