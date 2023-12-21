/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {MongoClient} from 'mongodb';
import {log} from '../../utils';
import {ENV, MONGO_DB, TIME_TO_DELETE, USER} from '../../config';
import {AppState} from '../../domain/entities';
import {inject, injectable} from 'tsyringe';
import moment from 'moment';

@injectable()
export class ErrorService {
  public errors = {};
  constructor(
    @inject('AppState')
    private readonly state: AppState,
    @inject('MongoClient')
    private readonly mongo: MongoClient
  ) {}

  addError = (message: string, label: string) => {
    if (this.errors[message]) return;

    this.errors[message] = true;
    this.state.redis
      .publish(
        `${USER}:RESPONSE`,
        `*ByBitTrader Error:* ${message} at ${label}`
      )
      .catch(err => log.errs.error(err));
    setTimeout(() => {
      delete this.errors[message];
    }, TIME_TO_DELETE);
  };

  addApiError = (
    retCode: number,
    label: string,
    sessionId: string,
    retMsg: string,
    name: string,
    response: unknown
  ) => {
    if (this.errors[retCode]) return;

    this.errors[retCode] = true;
    this.state.redis
      .publish(
        `${USER}:RESPONSE`,
        `*ByBitTrader Error:* retCode:${retCode} and message: ${retMsg} api: ${name} in ${label}`
      )
      .catch(err => log.errs.error(err));

    setTimeout(() => {
      delete this.errors[retCode];
    }, 120000);

    this.mongo
      .db(MONGO_DB)
      .collection(`${ENV}_errors`)
      .insertOne({
        sid: sessionId,
        name,
        userId: USER,
        label,
        response,
        createdAt: moment().utc().format(),
      })
      .catch(err => log.errs.error(err));
  };
}
