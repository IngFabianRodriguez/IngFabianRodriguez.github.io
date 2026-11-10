/** Rounds to `digits` decimals and drops a useless trailing zero ("0.40" becomes "0.4"). */
export const trimNumber = (value: number, digits: number): string =>
  Number(value.toFixed(digits)).toString();

/** A distance on a chart axis: at most one decimal, so 3.001 km reads as 3. */
export const formatKmTick = (km: number): string => trimNumber(km, 1);
