import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {OrderData, TickerData, Topic} from '../../../types';
import {Store} from '../../../domain/entities/Store';
// import {SUBMIT_ORDER} from '../../../constants';
import {RestClientV5} from 'bybit-api';
import {ProcessOrderData} from '../../../application/use-cases/ProcessOrderData';
import {initLogger} from '../../../utils/logger';
import {ERROR_EVENT} from '../../../constants';
import moment from 'moment';

const errLogger = initLogger('WsTopicHandler', 'logs/errors.log');
const socketLogger = initLogger('WsTopicHandler', 'logs/sockets.log', true);

@injectable()
export class WsTopicHandler {
  constructor(
    @inject('Store')
    private readonly store: Store,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('ProcessOrderData')
    private readonly useCase: ProcessOrderData
  ) {}

  async handle(socketData: Topic) {
    const {topic, data, ts} = socketData;
    socketLogger.info(JSON.stringify(socketData));
    if (topic === 'order') {
      const [orderData] = data;
      const {data: event, error} = await this.useCase
        .execute(orderData as OrderData)
        .catch(err => errLogger.error(err));

      if (error) this.emitter.emit(ERROR_EVENT, error);
      else this.emitter.emit(event as string);
    }

    if (topic.includes('tickers')) {
      console.log(
        `${ts} and seconds: ${moment(ts).seconds()}, timestamp: ${moment(
          ts
        ).format()}`
      );
      const {lastPrice} = data as unknown as TickerData;
      this.store.setLowPrice(lastPrice);
      this.store.updateLastCandleLowPrice(ts);
    }
  }
}
