import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT} from '../../constants';
import {PartiallyFilledAvgOrder} from './PartiallyFilledAvgOrder';
import {BybitService} from '../services';

const label = 'SyncExchState';
@injectable()
export class SyncExchState {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('AppState')
    private readonly state: AppState,
    @inject('PartiallyFilledAvgOrder')
    private readonly partiallyFilledAvgOrd: PartiallyFilledAvgOrder
  ) {}
  async execute() {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;

      const response = await this.service.getPositionInfo(label, {
        symbol,
        category,
      });

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
        const response = await this.service.getActiveOrders(label, {
          symbol,
          category,
        });

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
