/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {Redis} from 'ioredis';
import {container} from 'tsyringe';

import {RestClientV5, WebsocketClient} from 'bybit-api';
import {Options} from './domain/entities';
import {log} from './utils';
import {KeyChain} from './domain/entities/KeyChain';
import {API_KEY, API_SECRET} from './config';

const parseCmd = (str: string) => str.split('=')[0];

export const SOCKETS_SUBSCRIBE = 'SOCKETS_SUBSCRIBE';
export const SETUP_API_KEY = 'SETUP_API_KEY';
export const SETUP_API_SECRET = 'SETUP_API_SECRET';
export const APP_START = 'APP_START';
export const APP_STOP = 'APP_STOP';
export const APP_EXIT = 'APP_EXIT';
export const APP_SYNC_CONFIG = 'APP_SYNC_CONFIG';
export const APP_SYNC_STORE = 'APP_SYNC_STORE';

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
    .catch(err => log.errs.error(err));

  subscriber.on('message', async (channel, message) => {
    console.log({channel, message});
    const ws = container.resolve<WebsocketClient>('WebsocketClient');
    const keyChain = container.resolve<KeyChain>('KeyChain');
    const options = container.resolve<Options>('Options');
    const client = container.resolve<RestClientV5>('RestClientV5');

    keyChain.apiKey = API_KEY as string;
    keyChain.apiSecret = API_SECRET as string;

    console.log(client);

    //@ts-ignore
    ws.options.key = keyChain.apiKey;
    //@ts-ignore
    ws.options.secret = keyChain.apiSecret;
    console.log(
      await client.cancelAllOrders({symbol: 'BTCUSDT', category: 'linear'})
    );

    const cmd = parseCmd(message);
    if (cmd === SOCKETS_SUBSCRIBE) {
      const symbol = options.symbol;
      // ws.subscribeV5([`tickers.${symbol}`, 'order'], 'linear').catch(err =>
      //   log.errs.error(JSON.stringify(err))
      // );
    }
  });
}
