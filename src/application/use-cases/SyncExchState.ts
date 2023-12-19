import {RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT} from '../../constants';
import {PartiallyFilledAvgOrder} from './PartiallyFilledAvgOrder';

const label = 'SyncExchState';
@injectable()
export class SyncExchState {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('AppState')
    private readonly state: AppState,
    @inject('PartiallyFilledAvgOrder')
    private readonly partiallyFilledAvgOrd: PartiallyFilledAvgOrder
  ) {}
  async execute() {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;

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
        this.state.position.handleFilledProfitOrder();
        return;
      } else {
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

        const buyOrder = response.result.list.find(o => o.side === 'Buy');
        const sellOrder = response.result.list.find(o => o.side === 'Sell');

        if (sellOrder && parseFloat(sellOrder.cumExecQty) > 0) {
          // partially filled profit order
          this.state.position.handlePartiallyFilledProfitOrder(
            sellOrder.cumExecQty
          );
        }

        if (!buyOrder && this.state.orderBook.isAvgOrderExists) {
          // average order filled
          this.state.orderBook.isAvgOrderExists = false;
          this.state.position.lastAvgCumExecQty = '0';
          this.state.orderBook.incAvgOrderCount();
          this.state.candle.resetCandlesCount();

          this.state.position.lastAvgOrderPrice = buyOrder.avgPrice;
        }

        if (
          buyOrder &&
          this.state.orderBook.isAvgOrderExists &&
          parseFloat(buyOrder.cumExecQty) > 0
        ) {
          // avg order were partially filled
          const {cumExecQty, cumExecValue} = buyOrder;
          await this.partiallyFilledAvgOrd.execute({cumExecQty, cumExecValue});
        }
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
