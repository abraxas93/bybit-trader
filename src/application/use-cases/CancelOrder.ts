import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT, SUBMIT_PROFIT_ORDER} from '../../constants';
import {BybitService} from '../services';
import {AppState} from '../../domain/entities';

const label = 'CancelOrder';
@injectable()
export class CancelOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  async execute(side: string) {
    try {
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;

      const activeOrdersResponse = await this.service.getActiveOrders(label, {
        symbol,
        category,
      });

      const sideOrder = activeOrdersResponse.result.list.find(
        o => o.side === side
      );

      if (!sideOrder) {
        return;
      }
      const {orderId} = sideOrder;
      const body = {
        orderId,
        symbol,
        category,
      };

      const response = await this.service.cancelOrder(label, body);

      if (side === 'Sell' && !response.retCode) {
        this.state.orderBook.profitOrderId = '';
        this.emitter.emit(SUBMIT_PROFIT_ORDER);
      }
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
