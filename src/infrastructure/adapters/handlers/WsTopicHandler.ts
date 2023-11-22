import {inject, injectable} from 'tsyringe';
import {EventEmitter} from 'events';
import {OrderData, TickerData, Topic} from '../../../types';
import {ProcessOrderData} from '../../../application/use-cases/ProcessOrderData';
import {initLogger} from '../../../utils/logger';
import {ERROR_EVENT} from '../../../constants';
// import moment from 'moment';
import {StateContainer} from '../../../domain/entities';

const errLogger = initLogger('WsTopicHandler', 'logs/errors.log');
const tickerLogger = initLogger('WsTopicHandler', 'logs/tickers.log', true);
const orderLogger = initLogger('WsTopicHandler', 'logs/orders.log', true);

@injectable()
export class WsTopicHandler {
  constructor(
    @inject('StateContainer')
    private readonly state: StateContainer,
    @inject('EventEmitter')
    private readonly emitter: EventEmitter,
    @inject('ProcessOrderData')
    private readonly useCase: ProcessOrderData
  ) {}

  async handle(socketData: Topic) {
    const {topic, data, ts} = socketData;

    if (topic === 'order') {
      orderLogger.info(JSON.stringify(socketData));
      const [orderData] = data;
      const {data: event, error} = await this.useCase
        .execute(orderData as OrderData)
        .catch(err => errLogger.error(err));

      if (error) this.emitter.emit(ERROR_EVENT, error);
      else this.emitter.emit(event as string);
    }

    if (topic.includes('tickers')) {
      tickerLogger.info(JSON.stringify(socketData));
      // console.log(
      //   `${ts} and seconds: ${moment(ts).seconds()}, timestamp: ${moment(
      //     ts
      //   ).format()}`
      // );
      const {lastPrice} = data as unknown as TickerData;
      this.state.candles.updateLowPrice(lastPrice);
      this.state.candles.updateLastCandleLowPrice(ts);
    }
  }
}
