import {OrderClass} from '../../types';
import {Redis} from 'ioredis';
import {inject} from 'tsyringe';

export class OrderState {
  private _orderBook: Record<string, OrderClass> = {};
  private _isAvgOrderExists = false;
  private _isPositionExists = false;
  constructor(
    @inject('Redis')
    private readonly redis: Redis
  ) {}
}
