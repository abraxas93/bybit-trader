import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {initLogger} from '../../utils/logger';

import {SubmitProfitOrder} from './SubmitProfitOrder';
import {StateContainer} from '../../domain/entities';
import {ERROR_EVENT, ORDER_ID_NOT_FOUND} from '../../constants';

const apiLogger = initLogger('ReopenProfitOrder', 'logs/api.log');

@injectable()
export class ReopenProfitOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('StateContainer')
    private readonly state: StateContainer,
    @inject('SubmitProfitOrder')
    private readonly submitProfitOrdUseCase: SubmitProfitOrder,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter
  ) {}

  async execute() {
    try {
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;

      const orderId = this.state.trades.getOrderIdBy('TAKE_PROFIT_ORDER');
      if (!orderId) {
        return {data: null, error: ORDER_ID_NOT_FOUND};
      }

      const body = {
        orderId,
        symbol,
        category,
      };

      apiLogger.info(`REQUEST|ReopenProfitOrder|${JSON.stringify(body)}|`);
      const cancelResponse = await this.client.cancelOrder(body);
      apiLogger.info(
        `RESPONSE|ReopenProfitOrder|${JSON.stringify(cancelResponse)}|`
      );

      if (cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, cancelResponse);
      }

      const result = await this.submitProfitOrdUseCase.execute();

      return result;
    } catch (error) {
      return {data: null, error: (error as Error).message};
    }
  }
}
