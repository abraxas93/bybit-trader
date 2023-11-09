import {OrderParamsV5} from 'bybit-api';

export type Success<T> = {
  data: T;
  error: null;
};

export type Failure = {
  data: null;
  error: string;
};

export type UseCaseResult<T> = Success<T> | Failure;

export interface IUseCase<I, O> {
  execute(data: I): O;
}

export type Topic = {
  topic: string;
  id: string;
  creationTime: number;
  wsKey: string;
  data: unknown[];
  ts: number;
};

export type OrderClass = 'OPEN_ORDER' | 'TAKE_PROFIT_ORDER' | 'AVERAGE_ORDER';
export type SubmitOrderParams = OrderParamsV5 & {
  orderClass: OrderClass;
};

export type CandleEvent = {
  count: number;
  isAverageOrderOpened: boolean;
  lastCandleLowPrice: number;
  nextCandleTimeFrame: number;
};
