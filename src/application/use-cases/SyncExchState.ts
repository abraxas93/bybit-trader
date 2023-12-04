import {PositionV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {AppState, Options, OrderBook, Position} from '../../domain/entities';
import {ERROR_EVENT} from '../../constants';

const label = 'SyncExchState';
@injectable()
export class SyncExchState {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Options')
    private readonly options: Options,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('AppState')
    private readonly state: AppState,
    @inject('Position')
    private readonly position: Position
  ) {}
  async execute() {
    try {
      const symbol = this.options.symbol;
      const category = this.options.category;
      log.api.info(`${label}:REQUEST|getPositionInfo|${symbol} ${category}|`);
      const response = await this.client.getPositionInfo({
        symbol,
        category,
      });
      log.api.info(
        `${label}:RESPONSE|cancelAllOrders|${JSON.stringify(response)}|`
      );
      const position = response.result.list.pop();
      if (!position) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(response),
        });
        return;
      }
      if (position?.side === 'None') {
        log.api.info(`REQUEST|cancelAllOrders|${symbol} ${category}|`);
        const cancelResponse = await this.client.cancelAllOrders({
          category: category,
          symbol,
        });
        log.api.info(
          `RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
        );
        if (cancelResponse.retCode) {
          return {data: null, error: cancelResponse};
        }
        this.orderBook.clearOrderBook();
        this.position.handleFilledProfitOrder();
        this.state.unpause();
        return {data: true, error: null};
      } else {
        const symbol = this.options.symbol;
        const category = this.options.category;

        const response = await this.client.getActiveOrders({
          symbol,
          category,
        });

        if (response.retCode) {
          this.emitter.emit(ERROR_EVENT, {
            label,
            data: JSON.stringify(response),
          });
        }

        const {size} = position;
        const orderIds = this.orderBook.orderIds;

        const linkedIds = response.result.list.map(o => o.orderLinkId);
        orderIds.forEach(id => {
          if (!linkedIds.includes(id)) this.orderBook.removeFromOrdBook(id);
        });
        this.position.posQty = size;
        // get all orders from exch
        // get all orders from store
        // update store
        // unpause
        this.state.unpause();
        // continue
        return {data: true, error: null};
      }
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  }
}
