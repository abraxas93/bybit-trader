import {ENV} from './config';

// events
export const EVENT_ERROR = 'EVENT_ERROR';

export const SUBMIT_OPEN_ORDER = 'SUBMIT_OPEN_ORDER';
export const CANDLE_CLOSED = 'CANDLE_CLOSED';

export const SUBMIT_AVG_ORDER = 'SUBMIT_AVG_ORDER';
export const SUBMIT_PROFIT_ORDER = 'SUBMIT_PROFIT_ORDER';
export const CANCEL_ORDER = 'CANCEL_ORDER';

export const AVG_ORDER_FILLED = 'AVG_ORDER_FILLED';
export const OPEN_ORDER_FILLED = 'OPEN_ORDER_FILLED';
export const PROFIT_ORDER_FILLED = 'PROFIT_ORDER_FILLED';
export const ORDER_CANCELLED = 'ORDER_CANCELLED';

export const ERROR_EVENT = 'ERROR_EVENT';
export const LOG_EVENT = 'LOG_EVENT';

// consts

export const REOPEN_TIMER = 4000;

// errors
export const ERR_USER_NOT_FOUND = 'ERR_USER_NOT_FOUND';
export const ERR_INVALID_PASSWORD = 'ERR_INVALID_PASSWORD';
export const NOT_IMPLEMENTED = 'NOT_IMPLEMENTED';
export const ORDER_ID_NOT_FOUND = 'ORDER_ID_NOT_FOUN';

export const NULL_KEY = 'NULL_KEY';

export const RKEYS: Record<string, string> = {
  POS_QTY: `${ENV}:store:pos_qty`,
  LAST_AVG_ORD_PRICE: `${ENV}:store:last_avg_ord_price`,
  KLINE_STARTED: `${ENV}:store:kline_started`,
  IS_NEW_CANDLE: `${ENV}:store:is_new_candle`,
  AVG_ORDER_EXISTS: `${ENV}:store:avg_order_exists`,
  POSITION_OPENED: `${ENV}:store:position_opened`,
  CANDLE_LOW_PRICE: `${ENV}:store:candle_low_price`,
  LAST_CANDLE_LOW_PRICE: `${ENV}:store:last_candle_low_price`,
  TIMEFRAME: `${ENV}:store:timeframe`,
  ORDERBOOK: `${ENV}:store:orderbook`,
  AVG_POS_PRICE: `${ENV}:store:avg_pos_price`,
  AVG_ORDER_PRICE: `${ENV}:store:avg_order_price`,
  AVG_ORDER_COUNT: `${ENV}:store:avg_order_count`,
  PROFIT_TAKES_COUNT: `${ENV}:store:profit_takes_count`,
  SYMBOL: `${ENV}:cfg:symbol`,
  QUANTITY: `${ENV}:cfg:quantity`,
  PERIOD: `${ENV}:cfg:period`,
  MARTINGALE: `${ENV}:cfg:martingale`,
  PROFIT_RATE: `${ENV}:cfg:profit_rate`,
  AVG_RATE: `${ENV}:cfg:avg_rate`,
  MAX_AVG_COUNT: `${ENV}:cfg:max_avg_count`,
  MIN_CANDLES: `${ENV}:cfg:min_candles`,
  DIGITS: `${ENV}:cfg:digits`,
  CATEGORY: `${ENV}:cfg:category`,
  TRADE_CYCLES: `${ENV}:cfg:trade_cycles`,
};
