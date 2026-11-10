import type { Vec3 } from "@/domain/flyover/camera";

export interface MeshOptions {
  /** Cells along each side of the grid; an even number, so the rider is at a corner in the middle. */
  segments: number;
  cellM: number;
  /** Where the rider is, in the meters east and north of the frame of the flight. */
  center: { e: number; n: number };
  /** Height in meters of the ground at a point of the frame, or null when it is not known. */
  heightAt(e: number, n: number): number | null;
  /** Height used where the ground is not known. */
  fallbackHeight: number;
  /** Height of the rider: the scene is built with this height as zero. */
  baseHeight: number;
  /** Heights are multiplied by this, so that relief shows from far away. */
  exaggeration: number;
  /** Position in the texture, from 0 to 1, of a point of the frame. */
  uvAt(e: number, n: number): [number, number];
  /** Direction to the sun: x east, y up, z north. */
  sun: Vec3;
}

export interface TerrainMesh {
  /** x east, y up, z south, in meters from the rider. */
  positions: Float32Array;
  uvs: Float32Array;
  /** Light of each vertex; 1 on flat ground, more where the slope faces the sun, less where not. */
  shade: Float32Array;
  /** Where the grid is, for reading the height of the drawn surface at any point. */
  grid: { x0: number; z0: number; cellM: number; segments: number };
}

const MIN_SHADE = 0.55;
const MAX_SHADE = 1.35;

/**
 * The ground around the rider as a grid of vertices. The grid is fixed to the ground in steps of
 * a cell, so as the rider moves the vertices keep their places and the relief does not swim.
 */
export function buildTerrainMesh(options: MeshOptions): TerrainMesh {
  const { segments, cellM, center, exaggeration, baseHeight } = options;
  const side = segments + 1;
  const count = side * side;
  const baseE = Math.round(center.e / cellM) * cellM;
  const baseN = Math.round(center.n / cellM) * cellM;

  const worldE = (i: number) => baseE + (i - segments / 2) * cellM;
  const worldN = (j: number) => baseN + (j - segments / 2) * cellM;

  const heights = new Float32Array(count);
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const e = worldE(i);
      const n = worldN(j);
      const height = options.heightAt(e, n) ?? options.fallbackHeight;
      const v = j * side + i;
      heights[v] = height;
      positions[v * 3] = e - center.e;
      positions[v * 3 + 1] = (height - baseHeight) * exaggeration;
      positions[v * 3 + 2] = center.n - n;
      const [u, w] = options.uvAt(e, n);
      uvs[v * 2] = u;
      uvs[v * 2 + 1] = w;
    }
  }

  const sun = options.sun;
  const shade = new Float32Array(count);
  const at = (i: number, j: number) =>
    heights[Math.min(side - 1, Math.max(0, j)) * side + Math.min(side - 1, Math.max(0, i))] ?? 0;
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const slopeE =
        ((at(i + 1, j) - at(i - 1, j)) / (Math.min(side - 1, i + 1) - Math.max(0, i - 1)) / cellM) *
        exaggeration;
      const slopeN =
        ((at(i, j + 1) - at(i, j - 1)) / (Math.min(side - 1, j + 1) - Math.max(0, j - 1)) / cellM) *
        exaggeration;
      // The normal of a surface y = f(e, n) is (-df/de, 1, -df/dn).
      const length = Math.hypot(slopeE, 1, slopeN);
      const light = (-slopeE * sun.x + sun.y - slopeN * sun.z) / length / sun.y;
      shade[j * side + i] = Math.min(MAX_SHADE, Math.max(MIN_SHADE, light));
    }
  }

  return {
    positions,
    uvs,
    shade,
    grid: { x0: positions[0] ?? 0, z0: positions[2] ?? 0, cellM, segments },
  };
}

/** The triangles of the grid, two for each cell, all counter-clockwise seen from above. */
export function meshIndices(segments: number): Uint32Array {
  const side = segments + 1;
  const indices = new Uint32Array(segments * segments * 6);
  let at = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * side + i;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      indices.set([a, b, c, b, d, c], at);
      at += 6;
    }
  }
  return indices;
}

/**
 * Height of the surface that is drawn at a point (x east, z south, in meters from the rider), read
 * on the same triangles as the mesh. Something laid at this height sits on the ground as seen;
 * null outside the mesh.
 */
export function surfaceY(mesh: TerrainMesh, x: number, z: number): number | null {
  const { x0, z0, cellM, segments } = mesh.grid;
  const gx = (x - x0) / cellM;
  const gz = (z0 - z) / cellM;
  if (gx < 0 || gz < 0 || gx > segments || gz > segments) return null;

  const i = Math.min(segments - 1, Math.floor(gx));
  const j = Math.min(segments - 1, Math.floor(gz));
  const fx = gx - i;
  const fy = gz - j;
  const side = segments + 1;
  const y = (a: number, b: number) => mesh.positions[(b * side + a) * 3 + 1] ?? 0;
  const [ya, yb, yc, yd] = [y(i, j), y(i + 1, j), y(i, j + 1), y(i + 1, j + 1)];
  // The cell is split from its east corner to its north corner, as in `meshIndices`.
  return fx + fy <= 1
    ? ya + fx * (yb - ya) + fy * (yc - ya)
    : yd + (1 - fx) * (yc - yd) + (1 - fy) * (yb - yd);
}
