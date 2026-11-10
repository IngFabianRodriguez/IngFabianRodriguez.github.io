import type { Ride } from "@/domain/ride";
import { toLocalMeters } from "@/domain/viz/geo";

/** A point of the route in meters: east, north and altitude. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * The route as meters east and north of its first positioned sample, with the altitude. Samples
 * without a position are skipped; `visible` limits the route to the samples between two indices
 * (null draws nothing), which is how the hidden ends of the route stay hidden.
 */
export function localTrack(ride: Ride, visible?: [number, number] | null): Vec3[] {
  if (visible === null) return [];
  const from = visible?.[0] ?? 0;
  const to = visible?.[1] ?? ride.samples.length - 1;

  const track: Vec3[] = [];
  let ref: { lat: number; lon: number } | null = null;
  for (let i = from; i <= to; i++) {
    const sample = ride.samples[i];
    if (!sample || sample.lat === undefined || sample.lon === undefined) continue;
    ref ??= { lat: sample.lat, lon: sample.lon };
    const { x, y } = toLocalMeters(sample.lat, sample.lon, ref.lat, ref.lon);
    track.push({ x, y, z: sample.altitude });
  }
  return track;
}

export interface Projection {
  /** Turn around the vertical axis, in radians. */
  yaw: number;
  /** Camera height: 0 looks from the side, a quarter turn looks straight down. */
  pitch: number;
  width: number;
  height: number;
  margin: number;
  /** Factor applied to the altitude so the relief reads on a long route. */
  exaggeration: number;
}

export interface Projected {
  /** The route at its altitude. */
  line: ScreenPoint[];
  /** The same route flattened to the lowest altitude: its shadow on the ground. */
  ground: ScreenPoint[];
}

const MAX_EXAGGERATION = 30;
/** The relief should read as about this share of the width of the route. */
const RELIEF_SHARE = 0.3;

/** How much to stretch the altitude so the climbs are visible, between 1 and 30. */
export function autoExaggeration(points: Vec3[]): number {
  if (points.length < 2) return 1;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const zs = points.map((p) => p.z);
  const horizontal = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const relief = Math.max(...zs) - Math.min(...zs);
  if (relief < 1e-9 || horizontal <= 0) return 1;
  return Math.min(MAX_EXAGGERATION, Math.max(1, (RELIEF_SHARE * horizontal) / relief));
}

/**
 * Projects the route onto the screen with an oblique camera: the route is centered, turned by
 * `yaw`, tilted by `pitch` and scaled to fit the canvas inside its margins. Screen y grows
 * downward, as on a canvas.
 */
export function projectRoute(points: Vec3[], projection: Projection): Projected {
  if (points.length === 0) return { line: [], ground: [] };
  const { yaw, pitch, width, height, margin, exaggeration } = projection;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const zs = points.map((p) => p.z);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const lowest = Math.min(...zs);
  const [cosYaw, sinYaw, cosPitch, sinPitch] = [
    Math.cos(yaw),
    Math.sin(yaw),
    Math.cos(pitch),
    Math.sin(pitch),
  ];

  const place = (p: Vec3, z: number): ScreenPoint => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const across = dx * cosYaw - dy * sinYaw;
    const away = dx * sinYaw + dy * cosYaw;
    return { x: across, y: -(z * exaggeration * cosPitch + away * sinPitch) };
  };
  const line = points.map((p) => place(p, p.z - lowest));
  const ground = points.map((p) => place(p, 0));

  const all = [...line, ...ground];
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  const room = { w: Math.max(1, width - 2 * margin), h: Math.max(1, height - 2 * margin) };
  const scales = [
    maxX - minX > 1e-9 ? room.w / (maxX - minX) : Infinity,
    maxY - minY > 1e-9 ? room.h / (maxY - minY) : Infinity,
  ];
  const scale = Math.min(...scales);
  const factor = Number.isFinite(scale) ? scale : 1;

  const fit = (p: ScreenPoint): ScreenPoint => ({
    x: (p.x - (minX + maxX) / 2) * factor + width / 2,
    y: (p.y - (minY + maxY) / 2) * factor + height / 2,
  });
  return { line: line.map(fit), ground: ground.map(fit) };
}
