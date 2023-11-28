import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';
import {ERROR_EVENT} from '../../constants';
import {normalizeFloat} from '../../utils';

const apiLogger = initLogger('SubmitProfitOrder', 'api.log');

@injectable()
export class SubmitProfitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  async execute() {
    try {
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;
      const qty = this.state.trades.posQty;

      const orderLinkId = String(Date.now());

      const body: OrderParamsV5 = {
        symbol,
        qty: normalizeFloat(qty),
        side: 'Sell',
        orderType: 'Limit',
        price: this.state.trades.profitOrderPrice,
        category: category,
        orderLinkId,
      };
      apiLogger.info(`REQUEST|submitOrder|${JSON.stringify(body)}|`);
      this.state.trades.addToOrdBook(orderLinkId, 'TAKE_PROFIT_ORDER');
      const response = await this.client.submitOrder(body);
      apiLogger.info(`RESPONSE|submitOrder|${JSON.stringify(response)}|`);
      const {retCode} = response;

      if (retCode !== 0) {
        this.emitter.emit(ERROR_EVENT, response);
      }
      return {data: response, error: null};
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
