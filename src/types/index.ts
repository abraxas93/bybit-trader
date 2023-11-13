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

// export type CandleEvent = {
//   count: number;
//   isAverageOrderOpened: boolean;
//   lastCandleLowPrice: number;
//   nextCandleTimeFrame: number;
// };

export type TickerData = {
  symbol: string;
  price24hPcnt: string;
  markPrice: string;
  indexPrice: string;
  lastPrice: string;
  openInterestValue: string;
  fundingRate: string;
  bid1Price: string;
  bid1Size: string;
  ask1Price: string;
  ask1Size: string;
};

export type OrderData = {
  avgPrice: string;
  blockTradeId: string;
  cancelType: string;
  category: string;
  closeOnTrigger: false;
  createdTime: string;
  cumExecFee: string;
  cumExecQty: string;
  cumExecValue: string;
  lastExecQty?: string;
  leavesQty: string;
  leavesValue: string;
  orderId: string;
  orderIv: string;
  isLeverage: string;
  lastPriceOnCreated: string;
  orderStatus: string;
  orderLinkId: string;
  orderType: string;
  positionIdx: number;
  price: string;
  qty: string;
  reduceOnly: false;
  rejectReason: string;
  side: 'Buy' | 'Sell';
  slTriggerBy: string;
  stopLoss: string;
  stopOrderType: string;
  symbol: string;
  takeProfit: string;
  timeInForce: string;
  tpTriggerBy: string;
  triggerBy: string;
  triggerDirection: number;
  triggerPrice: string;
  updatedTime: string;
  placeType: string;
  smpType: string;
  smpGroup: number;
  smpOrderId: string;
  tpslMode: string;
  tpLimitPrice: string;
  slLimitPrice: string;
};
