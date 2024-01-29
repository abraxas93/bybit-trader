import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {AppState} from '../../domain/entities';
import {USER} from '../../config';

const label = 'UpdateDigitsAfter';
@injectable()
export class UpdateDigitsAfter {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async (digits: string) => {
    try {
      const oldValue = this.state.position.digitsAfter;
      this.state.position.digitsAfter = digits;
      await this.state.redis
        .publish(
          `${USER}:RESPONSE`,
          `*ByBitTrader:* old value: ${oldValue} and new: ${digits}`
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
