/** A point or a direction. The scene is built with x to the east, y up and z to the south, in meters. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A 4 x 4 matrix, column by column, as WebGL reads it. */
export type Mat4 = ArrayLike<number>;

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/** The matrix that turns the world as seen from `eye`, looking at `target`, into camera space. */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = { x: 0, y: 1, z: 0 }): Float32Array {
  const f = normalize(sub(target, eye));
  const s = normalize(cross(f, up));
  const u = cross(s, f);
  // prettier-ignore
  return new Float32Array([
    s.x, u.x, -f.x, 0,
    s.y, u.y, -f.y, 0,
    s.z, u.z, -f.z, 0,
    -dot(s, eye), -dot(u, eye), dot(f, eye), 1,
  ]);
}

/** Perspective projection with a vertical field of view in radians. */
export function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const range = near - far;
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / range, -1,
    0, 0, (2 * far * near) / range, 0,
  ]);
}

/** `a` times `b`: what `b` does comes first. */
export function multiply(a: Mat4, b: Mat4): Float32Array {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += (a[k * 4 + row] ?? 0) * (b[column * 4 + k] ?? 0);
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

/** Moves the whole picture up (positive) or down (negative) by a fraction of half its height. */
export function shiftView(ndcY: number): Float32Array {
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, ndcY, 0, 1,
  ]);
}

export interface ChaseOptions {
  target: Vec3;
  /** Direction of travel, radians clockwise from north. */
  bearingRad: number;
  /** Distance from the camera to the target. */
  distanceM: number;
  /** How far the camera looks down, radians below the horizon. */
  pitchRad: number;
  /** The camera is lifted to at least this height, so it does not go into a hill behind the rider. */
  minHeightM: number;
}

/** A camera behind and above the target, looking at it along the direction of travel. */
export function chaseCamera(options: ChaseOptions): { eye: Vec3; target: Vec3 } {
  const { target, bearingRad, distanceM, pitchRad } = options;
  const flat = Math.cos(pitchRad) * distanceM;
  const eye: Vec3 = {
    x: target.x - Math.sin(bearingRad) * flat,
    y: Math.max(options.minHeightM, target.y + Math.sin(pitchRad) * distanceM),
    z: target.z + Math.cos(bearingRad) * flat,
  };
  return { eye, target };
}

export interface Projected {
  /** Position in the picture from -1 to 1, x to the right and y up. */
  x: number;
  y: number;
  /** False when the point is behind the camera. */
  visible: boolean;
}

/** Where a point lands in the picture of a view-projection matrix. */
export function projectPoint(viewProjection: Mat4, point: Vec3): Projected {
  const m = viewProjection;
  const clip = (row: number) =>
    (m[row] ?? 0) * point.x +
    (m[4 + row] ?? 0) * point.y +
    (m[8 + row] ?? 0) * point.z +
    (m[12 + row] ?? 0);
  const w = clip(3);
  return { x: clip(0) / w, y: clip(1) / w, visible: w > 0 };
}

export interface ClearPitchOptions {
  target: Vec3;
  bearingRad: number;
  distanceM: number;
  /** The pitch used when nothing is in the way. */
  basePitchRad: number;
  /** The steepest pitch allowed. */
  maxPitchRad: number;
  /** Height of the ground, in the same meters as the scene, at a point given by x and z. */
  terrainY(x: number, z: number): number;
  /** The line of sight must pass at least this far over the ground. */
  marginM: number;
}

const PITCH_STEP_RAD = (2 * Math.PI) / 180;
const SIGHT_SAMPLES = 24;

/**
 * The smallest pitch, from the usual one up, at which the camera sees the target: the line from
 * the camera to the target passes over the ground all the way. A hill between the two makes the
 * camera look down more steeply, from higher up, instead of showing the hill.
 */
export function clearPitch(options: ClearPitchOptions): number {
  const { target } = options;
  for (let pitch = options.basePitchRad; pitch < options.maxPitchRad; pitch += PITCH_STEP_RAD) {
    const { eye } = chaseCamera({
      target,
      bearingRad: options.bearingRad,
      distanceM: options.distanceM,
      pitchRad: pitch,
      minHeightM: -Infinity,
    });
    let clear = true;
    for (let s = 1; s <= SIGHT_SAMPLES && clear; s++) {
      const t = s / SIGHT_SAMPLES;
      const x = target.x + (eye.x - target.x) * t;
      const y = target.y + (eye.y - target.y) * t;
      const z = target.z + (eye.z - target.z) * t;
      clear = y >= options.terrainY(x, z) + options.marginM;
    }
    if (clear) return pitch;
  }
  return options.maxPitchRad;
}

/**
 * Pitches for a run of frames made to change gently: each one is at least what its frame needs,
 * and the change starts and ends a little away from the frame that asks for it.
 */
export function smoothPitches(needed: number[], radius: number): number[] {
  const around = (i: number) => needed.slice(Math.max(0, i - radius), i + radius + 1);
  const peaks = needed.map((_, i) => Math.max(...around(i)));
  return peaks.map((_, i) => {
    const window = peaks.slice(Math.max(0, i - radius), i + radius + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });
}
