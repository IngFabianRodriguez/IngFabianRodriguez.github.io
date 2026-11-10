import type { Ride } from "@/domain/ride";
import type { SeriesPoint } from "@/domain/series";
import { toLocalMeters } from "@/domain/viz/geo";
import { visibleRange } from "@/domain/viz/privacy";

export interface Pt {
  x: number;
  y: number;
}

export interface MiniRouteOptions {
  width: number;
  height: number;
  padding: number;
  /** Meters at each end of the route that are not drawn. */
  hideEndsM: number;
}

/** Two samples further apart than this (seconds) are not joined by a line. */
const MAX_LINE_GAP_S = 60;

/**
 * The route as lines that fit a box, north up, keeping the proportions of the ground. Lines
 * break where a sample has no position and across long recording gaps. The `hideEndsM` meters at
 * each end are left out, so a card or a report that is shared does not give the home away.
 */
export function miniRoute(ride: Ride, options: MiniRouteOptions): Pt[][] {
  const visible = visibleRange(ride, options.hideEndsM);
  if (!visible) return [];

  const segments: { lat: number; lon: number }[][] = [];
  let current: { lat: number; lon: number }[] | null = null;
  let previousT = 0;
  for (let i = visible[0]; i <= visible[1]; i++) {
    const sample = ride.samples[i];
    if (!sample) continue;
    if (sample.lat === undefined || sample.lon === undefined) {
      current = null;
      continue;
    }
    if (current && sample.t - previousT > MAX_LINE_GAP_S) current = null;
    if (!current) {
      current = [];
      segments.push(current);
    }
    current.push({ lat: sample.lat, lon: sample.lon });
    previousT = sample.t;
  }

  const first = segments[0]?.[0];
  if (!first) return [];
  const local = segments.map((segment) =>
    segment.map((p) => {
      const { x, y } = toLocalMeters(p.lat, p.lon, first.lat, first.lon);
      return { x, y: -y };
    }),
  );

  const all = local.flat();
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const room = {
    w: Math.max(1, options.width - 2 * options.padding),
    h: Math.max(1, options.height - 2 * options.padding),
  };
  const scale = Math.min(
    maxX - minX > 1e-9 ? room.w / (maxX - minX) : Infinity,
    maxY - minY > 1e-9 ? room.h / (maxY - minY) : Infinity,
  );
  const factor = Number.isFinite(scale) ? scale : 1;

  return local.map((segment) =>
    segment.map((p) => ({
      x: (p.x - (minX + maxX) / 2) * factor + options.width / 2,
      y: (p.y - (minY + maxY) / 2) * factor + options.height / 2,
    })),
  );
}

/** Scales a series to a box, highest values at the top, for a small chart drawn in a report. */
export function sparkline(
  points: SeriesPoint[],
  box: { width: number; height: number; padding: number },
): Pt[] {
  if (points.length === 0) return [];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const innerW = box.width - 2 * box.padding;
  const innerH = box.height - 2 * box.padding;

  return points.map((p) => ({
    x: maxX > minX ? box.padding + ((p.x - minX) / (maxX - minX)) * innerW : box.padding,
    y:
      maxY > minY
        ? box.height - box.padding - ((p.y - minY) / (maxY - minY)) * innerH
        : box.height / 2,
  }));
}
