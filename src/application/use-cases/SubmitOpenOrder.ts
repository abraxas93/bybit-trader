import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {AppState} from '../../domain/entities';
import {getOrderLinkId, log} from '../../utils';

// TODO: add openLongPrice
const label = 'SubmitOpenOrder';
@injectable()
export class SubmitOpenOrder {
  constructor(
    @inject('RestClientV5')
    private readonly client: RestClientV5,
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

      log.api.info(`${label}:REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        symbol,
        category,
      });
      log.api.info(
        `${label}:RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );

      if (cancelResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(cancelResponse),
        });
      }

      if (this.state.candle.lastCandleLowPrice === '0') {
        log.api.info(`${label}:REQUEST|getKline|${symbol} ${category} 1|`);
        const response = await this.client.getKline({
          category: category as 'linear' | 'spot' | 'inverse',
          symbol: symbol,
          interval: '1',
        });
        log.api.info(`${label}:RESPONSE|getKline|${JSON.stringify(response)}|`);
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

      log.api.info(`${label}:REQUEST|submitOrder|${JSON.stringify(body)}|`);
      const response = await this.client.submitOrder(body);
      log.api.info(
        `${label}:RESPONSE|submitOrder|${JSON.stringify(response)}|`
      );

      const {retCode} = response;

      if (retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(response),
        });
      }
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
      // TODO: do rollback
    }
  }
}
