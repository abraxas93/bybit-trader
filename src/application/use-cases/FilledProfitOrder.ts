import {RestClientV5, WebsocketClient} from 'bybit-api';
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
import {ERROR_EVENT, LOG_EVENT, PROFIT_ORDER_FILLED} from '../../constants';
import {Redis} from 'ioredis';
import {USER} from '../../config';

const label = 'FilledProfitOrder';

@injectable()
export class FilledProfitOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('Options')
    private readonly options: Options,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('Position')
    private readonly position: Position,
    @inject('AppState')
    private readonly state: AppState,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient,
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('Redis')
    private readonly redis: Redis
  ) {}

  async execute() {
    try {
      const category = this.options.category;
      const symbol = this.options.symbol;

      this.orderBook.handleFilledProfitOrder();
      this.position.handleFilledProfitOrder();

      log.api.info(
        `${label}:REQUEST:cancelAllOrders:${JSON.stringify({symbol, category})}`
      );
      const response = await this.client.cancelAllOrders({
        category: category,
        symbol,
      });
      log.api.info(
        `${label}:RESPONSE:cancelAllOrders|${JSON.stringify(response)}|`
      );

      if (response.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(response),
        });
      }

      if (this.state.status === 'WAIT_AND_STOP') {
        this.ws.unsubscribeV5([`tickers.${symbol}`, 'order'], 'linear');
        this.orderBook.reset();
        this.position.closePosition();
        this.candle.clear();
        this.state.stop();

        await this.redis
          .publish(`${USER}:RESPONSE`, '*ByBitTrader:* application stopped')
          .catch(err => log.errs.error(err));
      }

      this.emitter.emit(PROFIT_ORDER_FILLED);
      this.emitter.emit(LOG_EVENT, {label});
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  }
}
