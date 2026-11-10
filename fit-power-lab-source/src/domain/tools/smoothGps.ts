import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile } from "@/fit/readFit";

export const DEFAULT_SMOOTHING_SAMPLES = 5;

/**
 * Smooths the GPS track with a centered moving average over `windowSamples` consecutive records
 * that have a position (an even number acts as the odd number below it), applied to latitude
 * and longitude separately. Near the two ends the window shrinks symmetrically (the first and
 * last point stay as they are), which keeps a straight line straight and does not drag the ends
 * inward. Only the position changes: distance, speed and altitude are written as they were, and
 * records without a position are left alone. Averaging also rounds off real corners, so keep the
 * window small (3 to 9 records) for a twisty route. The input is not changed.
 */
export function smoothGps(fit: FitFile, windowSamples = DEFAULT_SMOOTHING_SAMPLES): FitFile {
  const half = Math.max(0, Math.floor(windowSamples / 2));

  const positioned: { index: number; lat: number; lon: number }[] = [];
  fit.messages.forEach((m, index) => {
    const lat = m.fields["positionLat"];
    const lon = m.fields["positionLong"];
    if (m.mesgNum === MESG_RECORD && typeof lat === "number" && typeof lon === "number") {
      positioned.push({ index, lat, lon });
    }
  });

  const smoothed = new Map<number, { lat: number; lon: number }>();
  positioned.forEach((point, i) => {
    const reach = Math.min(half, i, positioned.length - 1 - i);
    let lat = 0;
    let lon = 0;
    for (let k = i - reach; k <= i + reach; k += 1) {
      lat += positioned[k]?.lat ?? 0;
      lon += positioned[k]?.lon ?? 0;
    }
    const count = 2 * reach + 1;
    smoothed.set(point.index, { lat: Math.round(lat / count), lon: Math.round(lon / count) });
  });

  return {
    messages: fit.messages.map((m, index) => {
      const point = smoothed.get(index);
      const fields = { ...m.fields };
      if (point) {
        fields["positionLat"] = point.lat;
        fields["positionLong"] = point.lon;
      }
      return { mesgNum: m.mesgNum, fields };
    }),
  };
}
