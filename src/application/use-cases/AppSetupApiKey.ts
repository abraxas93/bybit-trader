/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {container, inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {Options} from '../../domain/entities';
import {ERROR_EVENT} from '../../constants';
import {OrderClass} from '../../types';
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
    @inject('Options')
    private readonly options: Options,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('WebsocketClient')
    private readonly ws: WebsocketClient
  ) {}

  execute = async (apiKey: string) => {
    try {
      const redisKey = `${ENV}:${USER}:${API_KEY}`;

      const client = container.resolve<RestClientV5>('RestClientV5');

      console.log(client);

      // @ts-ignore
      this.client.key = apiKey;
      // @ts-ignore
      this.ws.options.key = apiKey;
      await this.redis.set(redisKey, 'true');
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        data: JSON.stringify(error),
      });
    }
  };
}
