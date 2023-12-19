import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {AppState} from '../../domain/entities';
import {AmendOrderParamsV5, RestClientV5} from 'bybit-api';

// INFO: For now this use case not finished and used
const label = 'AmmendOrder';
@injectable()
export class AmmendOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async (side: string) => {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;

      if (side === 'Buy') {
        const orderId = this.state.orderBook.avgOrderId;
        const price = this.state.position.avgOrderPrice;

        log.api.info(`${label}:REQUEST|amendOrder|${orderId} ${price}|`);
        const profitOrderResponse = await this.client.amendOrder({
          symbol,
          category,
          orderId,
          price,
        } as AmendOrderParamsV5);
        log.api.info(
          `${label}:RESPONSE|amendOrder|${JSON.stringify(profitOrderResponse)}|`
        );
      }
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
