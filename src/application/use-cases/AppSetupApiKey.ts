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
      const redisKey = `${ENV}:${USER}:${API_KEY}`;
      console.log({redisKey});
      // @ts-ignore
      this.client.key = apiKey;
      // @ts-ignore
      this.ws.options.key = apiKey;
      await this.redis.set(redisKey, 'true');
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
