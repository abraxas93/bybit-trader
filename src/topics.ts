import {Redis} from 'ioredis';
import {container} from 'tsyringe';
import {initLogger} from './utils/logger';

const errLogger = initLogger('bootstratTopicks', 'errors.log');

export function bootstratTopicks() {
  const subscriber = new Redis();

  subscriber
    .subscribe(`284182203:COMMAND`, (err: unknown, count: unknown) => {
      if (err) {
        // handle error
        console.error('Failed to subscribe: %s', (err as Error).message);
      } else {
        console.log(
          `Subscribed successfully! This client is currently subscribed to ${
            count as string
          } channels.`
        );
      }
    })
    .catch(err => errLogger.error(err));

  subscriber.on('message', (channel, message) => {
    console.log({channel, message});
  });
}
