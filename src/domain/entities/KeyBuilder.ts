import {
  API_KEY,
  API_SECRET,
  APP_STATUS,
  AVG_ORDER_COUNT,
  AVG_ORDER_EXISTS,
  AVG_POS_PRICE,
  AVG_RATE,
  CATEGORY,
  DIGITS,
  LAST_AVG_ORDER_PRICE,
  MARTIN,
  MAX_AVG_COUNT,
  MAX_TRADES,
  MIN_CANDLES,
  PERIOD,
  POSITION_EXISTS,
  POS_QTY,
  PROFIT_RATE,
  QUANTITY,
  REDIS_SETTINGS_KEYS,
  SYMBOL,
  TRADES_COUNT,
  UPCOMING_ACTION,
  UPDATED_AT,
} from '../../keys';

export interface ConfigKeys extends Record<string, string> {
  AVG_RATE: string;
  CATEGORY: string;
  DIGITS: string;
  MARTIN: string;
  MAX_AVG_COUNT: string;
  MIN_CANDLES: string;
  PERIOD: string;
  PROFIT_RATE: string;
  QUANTITY: string;
  SYMBOL: string;
  MAX_TRADES: string;
}

export interface StoreKeys extends Record<string, string> {
  AVG_ORDER_COUNT: string;
  AVG_ORDER_EXISTS: string;
  AVG_POS_PRICE: string;
  LAST_AVG_ORDER_PRICE: string;
  POS_QTY: string;
  POSITION_EXISTS: string;
  TRADES_COUNT: string;
}

export interface AppKeys extends Record<string, string> {
  API_KEY: string;
  API_SECRET: string;
  APP_STATUS: string;
  UPDATED_AT: string;
  UPCOMING_ACTION: string;
  SYMBOL: string;
}

export class KeyBuilder {
  static key(
    userId: string | number,
    symbol: string,
    key: string,
    env: string
  ) {
    const type = REDIS_SETTINGS_KEYS.includes(key) ? 'CONFIG' : 'STORE';
    return `${userId}:${env}:${symbol}:${type}:${key}`;
  }
  static buildUserKeys(prefix: string): Record<string, string> {
    const keys: Record<string, string> = {};
    keys[API_KEY] = `${prefix}:${API_KEY}`;
    keys[API_SECRET] = `${prefix}:${API_SECRET}`;
    keys[APP_STATUS] = `${prefix}:${APP_STATUS}`;
    keys[UPDATED_AT] = `${prefix}:${UPDATED_AT}`;
    keys[UPCOMING_ACTION] = `${prefix}:${UPCOMING_ACTION}`;
    keys[SYMBOL] = `${prefix}:${SYMBOL}`;
    return keys;
  }
  static buildKeys(
    prefix: string,
    symbol: string,
    type: 'CONFIG' | 'STORE'
  ): StoreKeys | ConfigKeys {
    const keys: Record<string, string> = {};
    if (type === 'CONFIG') {
      keys[AVG_RATE] = `${prefix}:${symbol}:${type}:${AVG_RATE}`;
      keys[CATEGORY] = `${prefix}:${symbol}:${type}:${CATEGORY}`;
      keys[DIGITS] = `${prefix}:${symbol}:${type}:${DIGITS}`;
      keys[MARTIN] = `${prefix}:${symbol}:${type}:${MARTIN}`;
      keys[MAX_AVG_COUNT] = `${prefix}:${symbol}:${type}:${MAX_AVG_COUNT}`;
      keys[MIN_CANDLES] = `${prefix}:${symbol}:${type}:${MIN_CANDLES}`;
      keys[PERIOD] = `${prefix}:${symbol}:${type}:${PERIOD}`;
      keys[PROFIT_RATE] = `${prefix}:${symbol}:${type}:${PROFIT_RATE}`;
      keys[QUANTITY] = `${prefix}:${symbol}:${type}:${QUANTITY}`;
      keys[SYMBOL] = `${prefix}:${symbol}:${type}:${SYMBOL}`;
      keys[MAX_TRADES] = `${prefix}:${symbol}:${type}:${MAX_TRADES}`;
      return keys as ConfigKeys;
    } else {
      keys[AVG_ORDER_COUNT] = `${prefix}:${symbol}:${type}:${AVG_ORDER_COUNT}`;
      keys[
        AVG_ORDER_EXISTS
      ] = `${prefix}:${symbol}:${type}:${AVG_ORDER_EXISTS}`;
      keys[AVG_POS_PRICE] = `${prefix}:${symbol}:${type}:${AVG_POS_PRICE}`;
      keys[
        LAST_AVG_ORDER_PRICE
      ] = `${prefix}:${symbol}:${type}:${LAST_AVG_ORDER_PRICE}`;
      keys[POS_QTY] = `${prefix}:${symbol}:${type}:${POS_QTY}`;
      keys[POSITION_EXISTS] = `${prefix}:${symbol}:${type}:${POSITION_EXISTS}`;
      keys[TRADES_COUNT] = `${prefix}:${symbol}:${type}:${TRADES_COUNT}`;
      return keys as StoreKeys;
    }
  }
}
