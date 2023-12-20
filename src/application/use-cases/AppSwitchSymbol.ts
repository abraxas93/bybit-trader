import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT} from '../../constants';
import {ENV, USER} from '../../config';
import {AppState} from '../../domain/entities';

const label = 'AppSwitchSymbol';
@injectable()
export class AppSwitchSymbol {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async (newSymbol: string) => {
    try {
      const symbol = await this.state.redis.get(`${USER}:${ENV}:SYMBOL`);
      if (symbol === newSymbol) return;
      await this.state.redis.set(`${USER}:${ENV}:SYMBOL`, newSymbol);
      await this.state.position.loadVars();
      await this.state.orderBook.loadVars();
      await this.state.options.loadVars(newSymbol);
      await this.state.redis.publish(
        `${USER}:RESPONSE`,
        '*ByBitTrader:* switch symbolt to \\-' + newSymbol
      );
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
