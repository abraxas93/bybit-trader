import {OrderParamsV5, RestClientV5} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT, LOG_EVENT} from '../../constants';
import {
  Options,
  CandleStick,
  OrderBook,
  AppState,
  Position,
} from '../../domain/entities';
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
    @inject('Options')
    private readonly options: Options,
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly position: Position,
    @inject('AppState')
    private readonly state: AppState
  ) {}
  private getOpenOrderPrice = () => {
    const lastPrice = this.position.lastPrice;
    const price =
      parseFloat(lastPrice as string) &&
      parseFloat(this.candle.lastCandleLowPrice) >
        parseFloat(lastPrice as string)
        ? parseFloat(this.position.bid1Price)
        : parseFloat(this.candle.lastCandleLowPrice);

    console.log({
      lastPrice,
      price,
      bid1Price: this.position.bid1Price,
      lastCandleLowPrice: this.candle.lastCandleLowPrice,
    });
    return String(price);
  };
  async execute() {
    try {
      // conditions
      if (!this.state.canOpenPositionOrder) return;

      const symbol = this.options.symbol;
      const category = this.options.category;
      const qty: string = this.options.quantity;

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

      this.orderBook.clearOrderBook();
      if (this.candle.lastCandleLowPrice === '0') {
        log.api.info(`${label}:REQUEST|getKline|${symbol} ${category} 1|`);
        const response = await this.client.getKline({
          category: category as 'linear' | 'spot' | 'inverse',
          symbol: symbol,
          interval: '1',
        });
        log.api.info(`${label}:RESPONSE|getKline|${JSON.stringify(response)}|`);
        const [, , , , lowPrice] = response.result.list[0];

        this.candle.lastCandleLowPrice = lowPrice;
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
      this.orderBook.addToOrdBook(orderLinkId, 'OPEN_ORDER');
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
        data: JSON.stringify(error),
      });
      // TODO: do rollback
    }
  }
}
