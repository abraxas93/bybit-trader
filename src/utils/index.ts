export function roundToNearestTen(number: number) {
  if (number < 10) {
    return 0;
  } else {
    return Math.floor(number / 10) * 10;
  }
}
