import {
  AmendOrderParamsV5,
  CancelAllOrdersParamsV5,
  CancelOrderParamsV5,
  GetAccountOrdersParamsV5,
  GetKlineParamsV5,
  OrderParamsV5,
  PositionInfoParamsV5,
  RestClientV5,
} from 'bybit-api';
import {v4} from 'uuid';
import {MongoClient} from 'mongodb';
import {inject, injectable} from 'tsyringe';
import {getOrderLinkId, log} from '../../utils';
import {ENV, MONGO_DB, USER} from '../../config';
import moment from 'moment';
import {ErrorService} from './ErrorService';

@injectable()
export class BybitService {
  public sessionId: string = v4();
  public isLogged = process.env.DB_LOGS;

  constructor(
    @inject('ErrorService')
    private readonly errService: ErrorService,
    @inject('RestClientV5')
    private readonly client: RestClientV5,
    @inject('MongoClient')
    private readonly mongo: MongoClient
  ) {}

  newSession = () => {
    this.sessionId = v4();
  };

  private saveRequest = (label: string, request: object, name: string) => {
    if (!this.isLogged) return;
    this.mongo
      .db(MONGO_DB)
      .collection(`${ENV}_requests`)
      .insertOne({
        sid: this.sessionId,
        name,
        userId: USER,
        label,
        ...request,
        createdAt: moment().utc().format(),
      })
      .catch(err => log.errs.error(err));
  };

  private saveResponse = (label: string, response: object, name: string) => {
    if (!this.isLogged) return;
    this.mongo
      .db(MONGO_DB)
      .collection(`${ENV}_responses`)
      .insertOne({
        sid: this.sessionId,
        name,
        userId: USER,
        label,
        ...response,
        createdAt: moment().utc().format(),
      })
      .catch(err => log.errs.error(err));
  };

  async cancelOrder(label: string, params: CancelOrderParamsV5) {
    const name = 'cancelOrder';
    log.api.info(`${label}:REQUEST|cancelOrder|${JSON.stringify(params)}|`);
    this.saveRequest(label, params, name);

    const response = await this.client.cancelOrder(params);

    log.api.info(`${label}:RESPONSE|cancelOrder|${JSON.stringify(response)}|`);
    if (response.retCode) {
      log.api.error(
        `${label}:RESPONSE|cancelOrder|${JSON.stringify(response)}|`
      );
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(
        `${label}:RESPONSE|cancelOrder|${JSON.stringify(response)}|`
      );
    }
    this.saveResponse(label, response, 'cancelOrder');
    return response;
  }

  async cancelAllOrders(label: string, params: CancelAllOrdersParamsV5) {
    const name = 'cancelAllOrders';
    log.api.info(`${label}:REQUEST|cancelAllOrders|${JSON.stringify(params)}|`);
    this.saveRequest(label, params, name);
    const response = await this.client.cancelAllOrders(params);

    if (response.retCode) {
      log.api.error(
        `${label}:RESPONSE|cancelAllOrders|${JSON.stringify(response)}|`
      );
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(
        `${label}:RESPONSE|cancelAllOrders|${JSON.stringify(response)}|`
      );
    }
    this.saveResponse(label, response, 'cancelAllOrders');

    return response;
  }

  async submitOrder(label: string, params: OrderParamsV5) {
    const name = 'submitOrder';
    const id = getOrderLinkId();
    const body = {
      ...params,
      orderLinkId: id,
    };

    log.api.info(`${label}:REQUEST|submitOrder|${JSON.stringify(body)}|`);

    this.saveRequest(label, body, name);

    const response = await this.client.submitOrder(body);

    if (response.retCode) {
      log.api.error(
        `${label}:RESPONSE|submitOrder|${JSON.stringify(response)}|`
      );
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(
        `${label}:RESPONSE|submitOrder|${JSON.stringify(response)}|`
      );
    }

    this.saveResponse(label, response, 'submitOrder');

    return response;
  }

  async amendOrder(label: string, params: AmendOrderParamsV5) {
    const name = 'amendOrder';
    log.api.info(`${label}:REQUEST|amendOrder|${JSON.stringify(params)}|`);
    this.saveRequest(label, params, name);
    const response = await this.client.amendOrder(params);

    if (response.retCode) {
      log.api.error(
        `${label}:RESPONSE|amendOrder|${JSON.stringify(response)}|`
      );
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(`${label}:RESPONSE|amendOrder|${JSON.stringify(response)}|`);
    }
    this.saveResponse(label, response, 'amendOrder');

    return response;
  }

  async getKline(label: string, params: GetKlineParamsV5) {
    const name = 'getKline';
    log.api.info(`${label}:REQUEST|getKline|${JSON.stringify(params)} 1|`);
    this.saveRequest(label, params, name);
    const response = await this.client.getKline(params);

    if (response.retCode) {
      log.api.error(`${label}:RESPONSE|getKline|${JSON.stringify(response)}|`);
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(`${label}:RESPONSE|getKline|${JSON.stringify(response)}|`);
    }
    this.saveResponse(label, response, 'getKline');

    return response;
  }

  async getPositionInfo(label: string, params: PositionInfoParamsV5) {
    const name = 'getPositionInfo';
    log.api.info(`${label}:REQUEST|getPositionInfo|${JSON.stringify(params)}|`);
    this.saveRequest(label, params, name);
    const response = await this.client.getPositionInfo(params);

    if (response.retCode) {
      log.api.error(
        `${label}:RESPONSE|getPositionInfo|${JSON.stringify(response)}|`
      );
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(
        `${label}:RESPONSE|getPositionInfo|${JSON.stringify(response)}|`
      );
    }
    this.saveResponse(label, response, name);

    return response;
  }

  async getActiveOrders(label: string, params: GetAccountOrdersParamsV5) {
    const name = 'getActiveOrders';
    log.api.info(`${label}:REQUEST|getActiveOrders|${JSON.stringify(params)}|`);

    this.saveRequest(label, params, name);

    const response = await this.client.getActiveOrders(params);

    if (response.retCode) {
      log.api.error(
        `${label}:RESPONSE|getActiveOrders:|${JSON.stringify(response)}|`
      );
      this.errService.addApiError(
        response.retCode,
        label,
        this.sessionId,
        response.retMsg,
        name,
        response
      );
    } else {
      log.api.info(
        `${label}:RESPONSE|getActiveOrders:|${JSON.stringify(response)}|`
      );
    }
    this.saveResponse(label, response, 'getActiveOrders');

    return response;
  }
}
