import {OrderParamsV5} from 'bybit-api';
import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {getOrderLinkId} from '../../utils';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {BybitService} from '../services';

const label = 'SubmitAvgOrder';

@injectable()
export class SubmitAvgOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  async execute() {
    if (!this.state.canOpenAvgOrder) return;
    const orderLinkId = getOrderLinkId();
    try {
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;
      const qty = this.state.position.avgQty;
      const price = this.state.position.avgOrderPrice;
      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Buy',
        orderType: 'Limit',
        price,
        category,
        orderLinkId,
      };

      this.state.orderBook.isAvgOrderExists = true;

      const response = await this.service.submitOrder(label, body);

      const {retCode, result} = response;
      if (retCode) {
        this.state.orderBook.isAvgOrderExists = false;
      }
      this.state.orderBook.avgOrderId = result.orderId;

      this.emitter.emit(LOG_EVENT, {
        label,
        data: null,
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
