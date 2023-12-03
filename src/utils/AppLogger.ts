import {initLogger} from './logger';

export class AppLogger {
  public readonly api = initLogger('api', 'api.log');
  public readonly error = initLogger('errors', 'errors.log');
  public readonly custom = initLogger('custom', 'logs.log'); // write sockets handler events data as well like sockets.log
  public readonly socket = initLogger('sockets', 'sockets.log');
  public readonly order = initLogger('order_book', 'order_book.log', true);
  public readonly position = initLogger('position', 'position.log', true);
  public readonly candle = initLogger('candle', 'candle.log', true);
  public readonly orders = initLogger('orders', 'orders.log', true);
}
