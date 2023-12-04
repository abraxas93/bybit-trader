import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {
  AppState,
  CandleStick,
  Options,
  OrderBook,
  Position,
} from '../../domain/entities';
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
    private readonly position: Position,
    @inject('CandleStick')
    private readonly candle: CandleStick
  ) {}
  async execute() {
    try {
      const symbol = this.options.symbol;
      const category = this.options.category;
      log.api.info(`${label}:REQUEST:getPositionInfo:${symbol} ${category}|`);
      const response = await this.client.getPositionInfo({
        symbol,
        category,
      });
      log.api.info(
        `${label}:RESPONSE:getPositionInfo:${JSON.stringify(response)}|`
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
        this.orderBook.clearOrderBook();
        this.position.handleFilledProfitOrder();
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

        const linkedIds = response.result.list.map(o => o.orderLinkId);
        const avgOrderId = this.orderBook.getOrderIdBy('AVERAGE_ORDER');
        if (avgOrderId && !linkedIds.includes(avgOrderId)) {
          // avg order were filled
          this.orderBook.removeFromOrdBook(avgOrderId);
          this.orderBook.isAvgOrderExists = false;
          this.position.lastAvgCumExecQty = '0';
          this.orderBook.incAvgOrderCount();
          this.candle.resetCandlesCount();
          this.state.resetReopenTimer();

          const orderData = response.result.list.find(
            o => o.orderLinkId === avgOrderId
          );

          orderData && (this.position.lastAvgOrderPrice = orderData.avgPrice);
        }
        if (avgOrderId && linkedIds.includes(avgOrderId)) {
          // avg order were partially filled
          const orderData = response.result.list.find(
            o => o.orderLinkId === avgOrderId
          );
          orderData &&
            (this.position.lastAvgCumExecQty = orderData?.cumExecQty);

          this.state.reopenProfitOrder();
        }

        this.position.posQty = position.size;
        this.position.avgPosPrice = position.avgPrice;
      }

      this.state.unpause();
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  }
}
