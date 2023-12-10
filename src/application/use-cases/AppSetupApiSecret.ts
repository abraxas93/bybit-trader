/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import {RestClientV5, WebsocketClient} from 'bybit-api';
import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {ERROR_EVENT} from '../../constants';
import {Redis} from 'ioredis';
import {ENV, USER} from '../../config';
import {API_SECRET} from '../../keys';
import {log} from '../../utils';

const label = 'AppSetupApiSecret';
@injectable()
export class AppSetupApiSecret {
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

  execute = async (secret: string) => {
    try {
      const redisKey = `${USER}:${ENV}:${API_SECRET}`;
      // @ts-ignore
      this.client.secret = secret;
      // @ts-ignore
      this.ws.options.secret = secret;
      await this.redis.set(redisKey, 'true');
      await this.redis
        .publish(
          `${USER}:RESPONSE`,
          `*ByBitTrader:* Sucessfully setup api secret \\- *${secret}*`
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
        data: JSON.stringify(error),
      });
    }
  };
}
