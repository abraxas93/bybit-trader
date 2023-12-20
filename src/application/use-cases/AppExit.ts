import {EventEmitter} from 'events';
import {inject, injectable} from 'tsyringe';
import {log} from '../../utils';
import {ERROR_EVENT, RKEYS} from '../../constants';
import {Redis} from 'ioredis';
import {Options} from '../../domain/entities';
import {BybitService} from '../services';

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
    @inject('BybitService')
    private readonly service: BybitService
  ) {}

  execute = async () => {
    try {
      const symbol = this.options.symbol;
      const category = this.options.category;

      const response = await this.service.cancelAllOrders(label, {
        symbol,
        category,
      });

      if (response.retCode) {
        return;
      } else {
        await this.redis.set(RKEYS.AVG_ORDER_EXISTS, 'false');
        await this.redis.set(RKEYS.PROFIT_TAKES_COUNT, '0');
      }
    } catch (error) {
      this.emitter.emit(ERROR_EVENT, {
        label,
        message: JSON.stringify((error as Error).message),
        stack: JSON.stringify((error as Error).stack),
      });
    } finally {
      // eslint-disable-next-line no-process-exit
      process.exit(0);
    }
  };
}
