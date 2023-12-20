import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT, OPEN_ORDER_FILLED} from '../../constants';

const label = 'FilledOpenOrder';

@injectable()
export class FilledOpenOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute({avgPrice, cumExecQty}: {avgPrice: string; cumExecQty: string}) {
    try {
      this.state.position.handleFilledLongOrder(cumExecQty, avgPrice);
      this.state.candle.resetCandlesCount();
      this.emitter.emit(OPEN_ORDER_FILLED);
      this.emitter.emit(LOG_EVENT, label);
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
