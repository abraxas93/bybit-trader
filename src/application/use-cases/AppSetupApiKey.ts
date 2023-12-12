/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {ENV, USER} from '../../config';
import {API_KEY} from '../../keys';

const label = 'AppSetupApiKey';
@injectable()
export class AppSetupApiKey {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient
  ) {}

  execute = async (apiKey: string) => {
    try {
      const redisKey = `${USER}:${ENV}:${API_KEY}`;
      // @ts-ignore
      this.client.key = apiKey;
      // @ts-ignore
      this.ws.options.key = apiKey;
      await this.redis.set(redisKey, 'true');
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          `*ByBitTrader:* Sucessfully setup api key \\- *${apiKey}*`
        )
        .catch(err => log.errs.error(err));
    } catch (error) {
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          `*ByBitTrader:* ${(error as Error).message}`
        )
        .catch(err => log.errs.error(err));
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    }
  };
}
