import {injectable} from 'tsyringe';

@injectable()
export class KeyChain {
  private _apiKey = '';
  private _apiSecret = '';
  constructor() {}

  set apiKey(val: string) {
    this._apiKey = val;
  }

  get apiKey() {
    return this._apiKey;
  }

  set apiSecret(val: string) {
    this._apiSecret = val;
  }

  get apiSecret() {
    return this._apiSecret;
  }
}
