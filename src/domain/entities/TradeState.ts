import {Redis} from 'ioredis';
import {inject} from 'tsyringe';

export class TradeState {
  private _avgPosPrice = '0';
  private _lastAvgOrderPrice = '0';
  private _avgOrderCount = 0;
  constructor(
    @inject('Redis')
    private readonly redis: Redis
  ) {}
}
