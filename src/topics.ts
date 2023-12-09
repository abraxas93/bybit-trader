import {Redis} from 'ioredis';
import {container} from 'tsyringe';
import {log} from './utils';
import {USER} from './config';
import {
  AppSetupApiKey,
  AppSetupApiSecret,
  AppStart,
  AppStop,
  AppWaitAndStop,
} from './application';

const parse = (str: string) => {
  return str.split(':');
};

export const SOCKETS_SUBSCRIBE = 'SOCKETS_SUBSCRIBE';
export const SETUP_API_KEY = 'SETUP_API_KEY';
export const SETUP_API_SECRET = 'SETUP_API_SECRET';
export const APP_START = 'APP_START';
export const APP_STOP = 'APP_STOP';
export const APP_WAIT_AND_EXIT = 'APP_WAIT_AND_EXI';
export const APP_SYNC_CONFIG = 'APP_SYNC_CONFIG';
export const APP_SYNC_STORE = 'APP_SYNC_STORE';

export function bootstratTopicks() {
  const subscriber = new Redis();

  subscriber
    .subscribe(
      `${USER}:COMMAND`,
      `${USER}:RESPONSE`,
      (err: unknown, count: unknown) => {
        if (err) {
          // handle error
          log.errs.error('Failed to subscribe: %s', (err as Error).message);
        } else {
          log.custom.info(
            `Subscribed successfully! This client is currently subscribed to ${
              count as string
            } channels.`
          );
        }
      }
    )
    .catch(err => log.errs.error(err));

  subscriber.on('message', async (channel, message) => {
    console.log({channel, message});
    const setupApiKeyUseCase =
      container.resolve<AppSetupApiKey>('AppSetupApiKey');
    const setupApiSecretUseCase =
      container.resolve<AppSetupApiSecret>('AppSetupApiSecret');

    const appStartUseCase = container.resolve<AppStart>('AppStart');
    const appStopUseCase = container.resolve<AppStop>('AppStop');
    const appWaitAndStop = container.resolve<AppWaitAndStop>('AppWaitAndStop');

    const [cmd, value] = parse(message);

    switch (cmd) {
      case SETUP_API_KEY:
        return setupApiKeyUseCase
          .execute(value)
          .catch(err => log.errs.error(err));
      case SETUP_API_SECRET:
        return setupApiSecretUseCase
          .execute(value)
          .catch(err => log.errs.error(err));
      case APP_START:
        return appStartUseCase.execute().catch(err => log.errs.error(err));
      case APP_STOP:
        return appStopUseCase.execute().catch(err => log.errs.error(err));
      case APP_WAIT_AND_EXIT:
        return appWaitAndStop.execute().catch(err => log.errs.error(err));
      case APP_SYNC_CONFIG:
        return;
      case APP_SYNC_STORE:
        return;
      default:
        log.errs.error(`${__filename}:COMMAND_NOT_RECOGNIZED:${cmd}`);
    }
  });
}
