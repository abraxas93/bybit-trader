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
