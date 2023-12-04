import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {AppState, OrderBook, Position} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';

const label = 'PartiallyFilledAvgOrder';
@injectable()
export class PartiallyFilledAvgOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Position')
    private readonly position: Position,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute({
    cumExecQty,
    cumExecValue,
  }: {
    cumExecQty: string;
    cumExecValue: string;
  }) {
    try {
      this.position.partiallyFillAvgOrder(cumExecQty, cumExecValue);
      this.state.reopenProfitOrder();
      this.emitter.emit(LOG_EVENT, {
        label,
        data: {cumExecQty, cumExecValue},
      });
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  }
}
