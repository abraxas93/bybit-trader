import {config} from 'dotenv';
config();

// env
export const NODE_ENV = process.env.NODE_ENV || 'dev';

// mongo
export const MONGO_URL = process.env.MONGO_URL;
export const MONGO_USER = process.env.MONGO_USER;
export const MONGO_DB = process.env.MONGO_DB;
export const MONGO_PASSWORD = process.env.MONGO_PASSWORD;

// http
export const SERVER_PORT = process.env.SERVER_PORT;

// password
export const PASSWORD_SALT = process.env.PASSWORD_SALT || '';
export const PASSWORD_LENGTH = parseInt(process.env.PASSWORD_LENGTH || '');

// env

export const ENV = process.env.NODE_ENV || '';

// ByBit secrets
export const API_KEY =
  ENV === 'prod' ? process.env.API_KEY : process.env.API_KEY_TEST;
export const API_SECRET =
  ENV === 'prod' ? process.env.API_SECRET : process.env.API_SECRET_TEST;

// config

export const SYMBOL = 'USTCUSDT';
export const BASE_QUANTITY = '10';
export const TIME_FRAME = 10;
export const MARTIN_GALE = 2;
export const TAKE_PROFIT_RATE = 1.007;
export const AVG_BUY_RATE = 0.995;
export const MAX_AVG_ORDER_COUNT = 10;
export const CANDLES_TO_WAIT = 1;
export const DIGITS_AFTER_COMMA = 6;
export const CATEGORY = 'linear';
export const TRADE_CYCLES = 10;
