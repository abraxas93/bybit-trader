import {WebsocketClient} from 'bybit-api';
import {container} from 'tsyringe';
import {log} from './utils';
import {WsTopicHandler} from './infrastructure/adapters/handlers/WsTopicHandler';
import {Topic} from './types';
import {Options} from './domain/entities';
import {SyncExchState} from './application/use-cases/SyncExchState';

export function bootstrapSockets() {
  const ws = container.resolve<WebsocketClient>('WebsocketClient');
  const wsHandler = container.resolve<WsTopicHandler>('WsTopicHandler');
  const options = container.resolve<Options>('Options');
  const syncPosition = container.resolve<SyncExchState>('SyncExchState');

  // 'order', 'position', 'execution'
  // const symbol = options.symbol;
  // ws.subscribeV5([`tickers.${symbol}`, 'order'], 'linear').catch(err =>
  //   log.errs.error(JSON.stringify(err))
  // );

  // ws.subscribe('kline.BTCUSD.1m').catch(err => console.log(err));

  ws.on('update', data => wsHandler.handle(data as Topic));

  // Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
  ws.on('open', ({wsKey, event}) => {
    log.socket.info(
      'connection open for websocket with ID: ' + wsKey + ' event: ',
      JSON.stringify(event)
    );
  });

  // Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
  ws.on('response', response => {
    log.socket.warn(JSON.stringify(response));
  });

  // Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
  ws.on('close', () => {
    log.socket.warn('connection closed');
  });

  // Optional: Listen to raw error events. Recommended.
  ws.on('error', err => {
    log.socket.error(JSON.stringify(err));
  });

  ws.on('reconnected', data => {
    log.socket.warn('ws has reconnected ', data?.wsKey);
    syncPosition.execute().catch(err => log.errs.error(JSON.stringify(err)));
  });
}
