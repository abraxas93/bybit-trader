import {WebsocketClient, WsKey} from 'bybit-api';
import {injectable} from 'tsyringe';
import {log} from '../utils';
import {WsTopicHandler} from '../infrastructure/adapters/handlers/WsTopicHandler';
import {Topic} from '../types';
import {Options} from '../domain/entities';
import {SyncExchState} from '../application/use-cases/SyncExchState';

@injectable()
export class WebsocketHandler {
  constructor(
    private readonly ws: WebsocketClient,
    private readonly wsHandler: WsTopicHandler,
    private readonly options: Options,
    private readonly syncPosition: SyncExchState
  ) {}

  startListening() {
    this.subscribeToTopics();
    this.setupEventListeners();
  }

  public subscribeToTopics() {
    const symbol = this.options.symbol;
    const category = this.options.category;
    this.ws
      .subscribeV5([`tickers.${symbol}`, 'order'], category)
      .catch(err => log.errs.error(JSON.stringify(err)));
    this.ws.subscribe('kline.BTCUSD.1m').catch(err => console.log(err));
  }

  public unsubscribeToTopics() {
    const symbol = this.options.symbol;
    const category = this.options.category;
    this.ws.unsubscribeV5([`tickers.${symbol}`, 'order'], category);
  }

  private setupEventListeners() {
    this.ws.on('update', data => this.handleUpdate(data as Topic));
    this.ws.on('open', this.handleOpen.bind(this));
    this.ws.on('response', this.handleResponse.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
    this.ws.on('reconnected', this.handleReconnected.bind(this));
  }

  private handleUpdate(data: Topic) {
    this.wsHandler.handle(data);
  }

  private handleOpen({wsKey, event}: {wsKey: string; event: any}) {
    log.socket.info(
      'Connection open for websocket with ID: ' +
        wsKey +
        ' event: ' +
        JSON.stringify(event)
    );
  }

  private handleResponse(response: any) {
    log.socket.warn(JSON.stringify(response));
  }

  private handleClose() {
    log.socket.warn('Connection closed');
  }

  private handleError(err: any) {
    log.socket.error(JSON.stringify(err));
  }

  private async handleReconnected(data: {wsKey?: WsKey}) {
    log.socket.warn('Websocket has reconnected ', data?.wsKey);
    await this.syncPosition
      .execute()
      .catch(err => log.errs.error(JSON.stringify(err)));
  }
}
