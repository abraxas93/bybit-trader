import {OrderParamsV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {getOrderLinkId} from '../../utils';
import {BybitService} from '../services';

const label = 'SubmitProfitOrder';
@injectable()
export class SubmitProfitOrder {
  constructor(
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  async execute() {
    try {
      if (!this.state.canOpenProfitOrder) return;
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;
      const qty = this.state.position.posQty;
      const price = this.state.position.profitOrderPrice;
      const orderLinkId = getOrderLinkId();

      const body: OrderParamsV5 = {
        symbol,
        qty,
        side: 'Sell',
        orderType: 'Limit',
        price,
        category,
        orderLinkId,
      };

      const response = await this.service.submitOrder(label, body);

      const {result} = response;

      this.state.orderBook.profitOrderId = result.orderId;

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
