import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {RKEYS} from '../../constants';
import {Redis} from 'ioredis';
import {Options} from '../../domain/entities';
import {RestClientV5} from 'bybit-api';

const label = 'AppExit';
@injectable()
export class AppExit {
  constructor(
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('Redis')
    private readonly redis: Redis,
    @inject('Options')
    private readonly options: Options,
    @inject('RestClientV5')
    private readonly client: RestClientV5
  ) {}

  execute = async () => {
    try {
      const symbol = this.options.symbol;
      const category = this.options.category;

      const response = await this.client.cancelAllOrders({symbol, category});
      log.api.info(response);
      if (response.retCode) {
        log.errs.error(`${label}:` + JSON.stringify(response));
      } else {
        await this.redis.set(RKEYS.AVG_ORDER_EXISTS, 'false');
        await this.redis.set(RKEYS.PROFIT_TAKES_COUNT, '0');
      }
    } catch (error) {
      log.errs.error(`${label}:` + (error as Error).message);
    } finally {
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    }
  };
}
