import {AppLogger} from './AppLogger';

export function roundToNearestTen(number: number) {
  if (number < 10) {
    return 0;
  } else {
    return Math.floor(number / 10) * 10;
  }
}

export function normalizeFloat(numberString: string) {
  return parseFloat(numberString).toString();
}

export function getOrderLinkId() {
  return String(Date.now());
}

export const log: AppLogger = new AppLogger();

export function normalizeQty(qty: string, afterComma: string) {
  const arr = qty.split('.');
  arr[1] = arr[1].slice(0, parseInt(afterComma));
  return arr.join('.');
}
