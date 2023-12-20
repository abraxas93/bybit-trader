import {OrderSideV5, OrderTypeV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {USER} from '../../config';
import {AppState} from '../../domain/entities';
import {BybitService} from '../services';

const label = 'AppStop';
@injectable()
export class AppStop {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
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
        this.ws.unsubscribeV5([`tickers.${symbol}`, 'order'], 'linear');
        this.state.orderBook.reset();
        this.state.position.closePosition();
        this.state.candle.clear();
        this.state.stop();

        await this.state.redis
          .publish(`${USER}:RESPONSE`, '*ByBitTrader:* application stopped')
          .catch(err => log.errs.error(err));
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

      await this.service.submitOrder(label, request);
      await this.service.cancelAllOrders(label, {
        symbol,
        category,
      });

      this.ws.unsubscribeV5([`tickers.${symbol}`, 'order'], 'linear');

      this.state.orderBook.reset();
      this.state.position.closePosition();
      this.state.candle.clear();
      this.state.stop();

      await this.state.redis
        .publish(`${USER}:RESPONSE`, '*ByBitTrader:* App stopped')
        .catch(err => log.errs.error(err));
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
