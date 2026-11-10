import type { Vec3 } from "@/domain/flyover/camera";

/** Red, green, blue and alpha, each from 0 to 1. */
export type Rgba = [number, number, number, number];

export interface RibbonColors {
  /** The part of the route already travelled. */
  done: Rgba;
  /** The part still ahead. */
  ahead: Rgba;
}

export interface RibbonOptions {
  halfWidthM: number;
  /** The ribbon floats this much over the ground, so the ground does not hide it. */
  liftM: number;
  /** Two points further apart than this are not joined. */
  maxGapM: number;
  colors: RibbonColors;
}

export interface Ribbon {
  /** Three numbers for each vertex, in triangles. */
  positions: Float32Array;
  /** Four numbers for each vertex. */
  colors: Float32Array;
  vertexCount: number;
}

/**
 * The route as a flat strip of triangles lying on the ground, lit by what has been travelled
 * (`done[i]` says whether point `i` has been). Stretches that have no length or are too long to be
 * real movement are left out.
 */
export function buildRibbon(points: Vec3[], done: boolean[], options: RibbonOptions): Ribbon {
  const { halfWidthM, liftM, maxGapM, colors } = options;
  const positions: number[] = [];
  const rgba: number[] = [];

  for (let i = 0; i + 1 < points.length; i++) {
    const p = points[i];
    const q = points[i + 1];
    if (!p || !q) continue;
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6 || length > maxGapM) continue;

    // Sideways, in the plane of the ground.
    const sx = (-dz / length) * halfWidthM;
    const sz = (dx / length) * halfWidthM;
    const pl: Vec3 = { x: p.x + sx, y: p.y + liftM, z: p.z + sz };
    const pr: Vec3 = { x: p.x - sx, y: p.y + liftM, z: p.z - sz };
    const ql: Vec3 = { x: q.x + sx, y: q.y + liftM, z: q.z + sz };
    const qr: Vec3 = { x: q.x - sx, y: q.y + liftM, z: q.z - sz };
    const color = done[i] ? colors.done : colors.ahead;
    for (const v of [pl, pr, ql, ql, pr, qr]) {
      positions.push(v.x, v.y, v.z);
      rgba.push(...color);
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(rgba),
    vertexCount: positions.length / 3,
  };
}
