/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {USER} from '../../config';
import {AppState} from '../../domain/entities';

const label = 'AppSyncConfig';
@injectable()
export class AppSyncConfig {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
    try {
      await this.state.options.loadVars();
      await this.state.redis
        .publish(
          `${USER}:RESPONSE`,
          '*ByBitTrader:* Application update config vars'
        )
        .catch(err => log.errs.error(err));
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
