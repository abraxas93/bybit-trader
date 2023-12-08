import {
  OrderSideV5,
  OrderTypeV5,
  RestClientV5,
  WebsocketClient,
} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {USER} from '../../config';
import {
  AppState,
  CandleStick,
  Options,
  OrderBook,
  Position,
} from '../../domain/entities';

const label = 'AppExit';
@injectable()
export class AppExit {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient,
    @inject('Options')
    private readonly options: Options,
    @inject('Postion')
    private readonly position: Position,
    @inject('OrderBook')
    private readonly orderBook: OrderBook,
    @inject('CandleStick')
    private readonly candle: CandleStick,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
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
        return;
      }

      const side = position.side === 'Buy' ? 'Sell' : 'Buy';
      const request = {
        symbol,
        category: category,
        orderType: 'Market' as OrderTypeV5,
        side: side as OrderSideV5,
        qty: position.size,
      };

      log.api.info(
        `${label}:REQUEST:getPositionInfo:${JSON.stringify(request)}|`
      );
      const orderResponse = await this.client.submitOrder(request);
      log.api.info(
        `${label}:RESPONSE:getPositionInfo:${JSON.stringify(orderResponse)}|`
      );

      if (orderResponse.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(orderResponse),
        });
      }

      log.api.info(`${label}:REQUEST|cancelAllOrders|${symbol} ${category}|`);
      const cancelResponse = await this.client.cancelAllOrders({
        symbol,
        category,
      });
      log.api.info(
        `${label}:RESPONSE|cancelAllOrders|${JSON.stringify(cancelResponse)}|`
      );

      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(cancelResponse),
      });

      this.ws.unsubscribeV5([`tickers.${symbol}`, 'order'], 'linear');

      this.orderBook.reset();
      this.position.closePosition();
      this.candle.clear();
      this.state.stop();

      await this.redis
        .publish(`${USER}:RESPONSE`, 'SETUP_API_KEY=true')
        .catch(err => log.errs.error(err));
    } catch (error) {
      await this.redis
        .publish(`${USER}:RESPONSE`, 'SETUP_API_KEY=error')
        .catch(err => log.errs.error(err));
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  };
}
