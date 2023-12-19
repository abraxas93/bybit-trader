import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {AmendOrderParamsV5, RestClientV5} from 'bybit-api';
import {log} from '../../utils';

const label = 'PartiallyFilledAvgOrder';
@injectable()
export class PartiallyFilledAvgOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState,
    @inject('RestClientV5')
    private readonly client: RestClientV5
  ) {}

  async execute({
    cumExecQty,
    cumExecValue,
  }: {
    cumExecQty: string;
    cumExecValue: string;
  }) {
    try {
      this.state.position.partiallyFillAvgOrder(cumExecQty, cumExecValue);
      const orderId = this.state.orderBook.profitOrderId;
      const qty = this.state.position.posQty;
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;

      log.api.info(`${label}:REQUEST|amendOrder|${orderId} ${qty}|`);
      const profitOrderResponse = await this.client.amendOrder({
        symbol,
        category,
        orderId,
        qty,
      } as AmendOrderParamsV5);
      log.api.info(
        `${label}:RESPONSE|amendOrder|${JSON.stringify(profitOrderResponse)}|`
      );

      if (profitOrderResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(profitOrderResponse),
        });
      }

      this.emitter.emit(LOG_EVENT, {
        label,
        data: {cumExecQty, cumExecValue},
      });
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
