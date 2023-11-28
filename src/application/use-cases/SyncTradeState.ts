import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT} from '../../constants';
import {initLogger} from '../../utils/logger';
import {StateContainer} from '../../domain/entities';

const apiLogger = initLogger('SyncTradeState', 'api.log');

@injectable()
export class SyncTradeState {
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
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;
      apiLogger.info(`REQUEST|getPositionInfo|${symbol} ${category}|`);
      const response = await this.client.getPositionInfo({
        symbol,
        category,
      });
      apiLogger.info(`RESPONSE|cancelAllOrders|${JSON.stringify(response)}|`);
      console.log(response.result.list);
      const position = response.result.list.pop();
      if (position?.side === 'None') {
        // delete all orders from store
        // clear position
        // cancel average order
        // unpause
        return {data: null, error: null};
      } else {
        // update quantity
        // get all orders from exch
        // get all orders from store
        // update store
        // unpause
        // continue
        return {data: null, error: null};
      }
      return {data: response, error: null};
    } catch (error) {
      return {error: (error as Error).message, data: null};
    }
  }
}
