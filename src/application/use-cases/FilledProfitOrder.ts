import {WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {AppState} from '../../domain/entities';
import {ERROR_EVENT, LOG_EVENT, PROFIT_ORDER_FILLED} from '../../constants';
import {USER} from '../../config';
import {BybitService} from '../services';

const label = 'FilledProfitOrder';

@injectable()
export class FilledProfitOrder {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('AppState')
    private readonly state: AppState,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient
  ) {}

  async execute() {
    try {
      const category = this.state.options.category;
      const symbol = this.state.options.symbol;

      const response = await this.service.cancelAllOrders(label, {
        category: category,
        symbol,
      });

      if (response.retCode) {
        this.emitter.emit(ERROR_EVENT, {
          label,
          data: JSON.stringify(response),
        });
      }

      this.state.orderBook.handleFilledProfitOrder();
      this.state.position.handleFilledProfitOrder();

      if (this.state.status === 'WAIT_AND_STOP') {
        this.state.stop();
        this.ws.unsubscribeV5([`tickers.${symbol}`, 'order'], 'linear');
        this.state.orderBook.reset();
        this.state.position.closePosition();
        this.state.candle.clear();

        await this.state.redis
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
