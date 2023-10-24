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
