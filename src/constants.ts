// events
export const EVENT_ERROR = 'EVENT_ERROR';

export const SUBMIT_OPEN_ORDER = 'SUBMIT_OPEN_ORDER';
export const CANDLE_CLOSED = 'CANDLE_CLOSED';

export const SUBMIT_AVG_ORDER = 'SUBMIT_AVG_ORDER';
export const SUBMIT_PROFIT_ORDER = 'SUBMIT_PROFIT_ORDER';
export const REOPEN_PROFIT_ORDER = 'REOPEN_PROFIT_ORDER';

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
  POS_QTY: 'store:pos_qty',
  LAST_AVG_ORD_PRICE: 'store:last_avg_ord_price',
  KLINE_STARTED: 'store:kline_started',
  IS_NEW_CANDLE: 'store:is_new_candle',
  AVG_ORDER_EXISTS: 'store:avg_order_exists',
  POSITION_OPENED: 'store:position_opened',
  CANDLE_LOW_PRICE: 'store:candle_low_price',
  LAST_CANDLE_LOW_PRICE: 'store:last_candle_low_price',
  TIMEFRAME: 'store:timeframe',
  ORDERBOOK: 'store:orderbook',
  AVG_POS_PRICE: 'store:avg_pos_price',
  AVG_ORDER_PRICE: 'store:avg_order_price',
  AVG_ORDER_COUNT: 'store:avg_order_count',
  PROFIT_TAKES_COUNT: 'store:profit_takes_count',
  SYMBOL: 'cfg:symbol',
  QUANTITY: 'cfg:quantity',
  PERIOD: 'cfg:period',
  MARTINGALE: 'cfg:martingale',
  PROFIT_RATE: 'cfg:profit_rate',
  AVG_RATE: 'cfg:avg_rate',
  MAX_AVG_COUNT: 'cfg:max_avg_count',
  MIN_CANDLES: 'cfg:min_candles',
  DIGITS: 'cfg:digits',
  CATEGORY: 'cfg:category',
  TRADE_CYCLES: 'cfg:trade_cycles',
};
