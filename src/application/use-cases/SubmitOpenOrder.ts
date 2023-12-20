import {OrderParamsV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {AppState} from '../../domain/entities';
import {getOrderLinkId} from '../../utils';
import {BybitService} from '../services';

// TODO: add openLongPrice
const label = 'SubmitOpenOrder';
@injectable()
export class SubmitOpenOrder {
  constructor(
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  private getOpenOrderPrice = () => {
    const lastPrice = this.state.position.lastPrice;
    const price =
      parseFloat(lastPrice) &&
      parseFloat(this.state.candle.lastCandleLowPrice) >= parseFloat(lastPrice)
        ? parseFloat(this.state.position.bid1Price)
        : parseFloat(this.state.candle.lastCandleLowPrice);

    return String(price);
  };

  async execute() {
    try {
      // conditions
      if (!this.state.canOpenPositionOrder) return;

      const symbol = this.state.options.symbol;
      const category = this.state.options.category;
      const qty: string = this.state.options.quantity;

      await this.service.cancelAllOrders(label, {
        symbol,
        category,
      });

      if (this.state.candle.lastCandleLowPrice === '0') {
        const response = await this.service.getKline(label, {
          category: category as 'linear' | 'spot' | 'inverse',
          symbol: symbol,
          interval: '1',
        });

        const [, , , , lowPrice] = response.result.list[0];

        this.state.candle.lastCandleLowPrice = lowPrice;
      }

      const orderLinkId = getOrderLinkId();
      const price = this.getOpenOrderPrice();

      const body: OrderParamsV5 = {
        symbol: symbol,
        side: 'Buy',
        orderType: 'Limit',
        qty,
        price: price,
        category,
        orderLinkId,
      };

      await this.service.submitOrder(label, body);

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
