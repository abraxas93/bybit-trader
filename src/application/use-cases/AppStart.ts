/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {container, inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {ENV, USER} from '../../config';
import {AppState, Options} from '../../domain/entities';
import {SubmitOpenOrder} from './SubmitOpenOrder';
import {API_KEY, API_SECRET} from '../../keys';

const START_TIME = 6000;

const label = 'AppStart';
@injectable()
export class AppStart {
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
    @inject('AppState')
    private readonly state: AppState
  ) {}

  execute = async () => {
    try {
      const symbol = this.options.symbol;
      const category = this.options.category;
      const isApiKeyExists = await this.redis.get(
        `${ENV}:${USER}:${API_KEY || ''}`
      );
      const isApiSecretExists = await this.redis.get(
        `${ENV}:${USER}:${API_SECRET || ''}`
      );
      console.log({isApiKeyExists, isApiSecretExists});
      if (!isApiKeyExists) throw new Error('Error: Api key require setup');
      if (!isApiSecretExists)
        throw new Error('Error: Api secret require setup');

      const ws = container.resolve<WebsocketClient>('WebsocketClient');

      let message = `${USER}:APP_START=`;

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

      setTimeout(async () => {
        const useCase = container.resolve<SubmitOpenOrder>('SubmitOpenOrder');
        await useCase.execute();
        message += 'Bybit Trader started';
        await this.redis
          .publish(`${USER}:RESPONSE`, message)
          .catch(err => log.errs.error(err));
      }, START_TIME);
    } catch (error) {
      await this.redis
        .publish(`${USER}:RESPONSE`, `APP_START=${(error as Error).message}`)
        .catch(err => log.errs.error(err.message));
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: (error as Error).message,
      });
    }
  };
}
