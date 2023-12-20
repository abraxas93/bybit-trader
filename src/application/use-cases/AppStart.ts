/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {container, inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {ENV, USER} from '../../config';
import {AppState} from '../../domain/entities';
import {SubmitOpenOrder} from './SubmitOpenOrder';
import {API_KEY, API_SECRET} from '../../keys';
import {BybitService} from '../services';

const START_TIME = 6000;

const label = 'AppStart';
@injectable()
export class AppStart {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('BybitService')
    private readonly service: BybitService,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient,
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
    try {
      const symbol = this.state.options.symbol;
      const category = this.state.options.category;
      const isApiKeyExists = await this.state.redis.get(
        `${USER}:${ENV}:${API_KEY || ''}`
      );
      const isApiSecretExists = await this.state.redis.get(
        `${USER}:${ENV}:${API_SECRET || ''}`
      );

      if (!isApiKeyExists)
        throw new Error('*ByBitTrader:* Error \\- api key require setup');
      if (!isApiSecretExists)
        throw new Error('*ByBitTrader:* Error \\- api secret require setup');

      if (this.state.status === 'ACTIVE')
        throw new Error('*ByBitTrader:* already active');

      const ws = container.resolve<WebsocketClient>('WebsocketClient');

      let message = `*ByBitTrader:* `;

      // @ts-ignore
      if (!this.client.key) {
        message += 'Error: App require api key';
      }

      // @ts-ignore
      if (!this.ws.options.secret) {
        message += 'Error: App require api secret';
      }

      this.state.start();
      ws.subscribeV5([`tickers.${symbol}`, 'order'], category).catch(err =>
        log.errs.error(JSON.stringify(err))
      );
      this.service.newSession();
      setTimeout(async () => {
        const useCase = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
        await useCase.execute();
        message += 'Started';
        await this.state.redis
          .publish(`${USER}:RESPONSE`, message)
          .catch(err => log.errs.error(err));
      }, START_TIME);
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
