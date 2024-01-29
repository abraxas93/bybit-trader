import {Redis} from 'ioredis';
import {container, injectable} from 'tsyringe';
import {log} from '../utils';
import {REDIS_HOST, USER} from '../config';
import {
  AppSetupApiKey,
  AppSetupApiSecret,
  AppStart,
  AppStop,
  AppSyncConfig,
  AppSyncStore,
  AppWaitAndStop,
  AppSwitchSymbol,
  UpdateDigitsAfter,
} from '../application';

const parse = (str: string) => {
  return str.split(':');
};

export const SOCKETS_SUBSCRIBE = 'SOCKETS_SUBSCRIBE';
export const SETUP_API_KEY = 'SETUP_API_KEY';
export const SETUP_API_SECRET = 'SETUP_API_SECRET';
export const APP_START = 'APP_START';
export const APP_STOP = 'APP_STOP';
export const APP_WAIT_AND_EXIT = 'APP_WAIT_AND_EXIT';
export const APP_SYNC_CONFIG = 'APP_SYNC_CONFIG';
export const APP_SYNC_STORE = 'APP_SYNC_STORE';
export const CHANGE_CURRENT_SYMBOL = 'CHANGE_CURRENT_SYMBOL';
export const CHANGE_DIGIT_AFTER = 'CHANGE_DIGIT_AFTER';

// Move the Redis subscription logic to a separate class
@injectable()
export class RedisSubscriber {
  async subscribeToChannels() {
    const subscriber = new Redis({port: 6379, host: REDIS_HOST});
    try {
      const count = await subscriber.subscribe(`${USER}:COMMAND`);

      log.custom.info(
        `Subscribed successfully! This client is currently subscribed to ${
          count as number
        } channels.`
      );

      subscriber.on('message', (channel, message) => {
        log.custom.info({channel, message});
        this.handleMessage(message);
      });
    } catch (err) {
      log.errs.error('Failed to subscribe: %s', (err as Error).message);
    }
  }

  private handleMessage(message: string) {
    const [cmd, value] = parse(message);
    const useCase = this.resolveUseCase(cmd);
    if (useCase) {
      useCase.execute(value).catch(err => log.errs.error(err));
    } else {
      log.errs.error(`${__filename}:COMMAND_NOT_RECOGNIZED:${cmd}`);
    }
  }

  private resolveUseCase(cmd: string) {
    switch (cmd) {
      case SETUP_API_KEY:
        return container.resolve<AppSetupApiKey>('AppSetupApiKey');
      case SETUP_API_SECRET:
        return container.resolve<AppSetupApiSecret>('AppSetupApiSecret');
      case APP_START:
        return container.resolve<AppStart>('AppStart');
      case APP_STOP:
        return container.resolve<AppStop>('AppStop');
      case APP_WAIT_AND_EXIT:
        return container.resolve<AppWaitAndStop>('AppWaitAndStop');
      case APP_SYNC_CONFIG:
        return container.resolve<AppSyncConfig>('AppSyncConfig');
      case APP_SYNC_STORE:
        return container.resolve<AppSyncStore>('AppSyncStore');
      case CHANGE_CURRENT_SYMBOL:
        return container.resolve<AppSwitchSymbol>('AppSwitchSymbol');
      case CHANGE_DIGIT_AFTER:
        return container.resolve<UpdateDigitsAfter>('UpdateDigitsAfter>');
      default:
        return null;
    }
  }
}
