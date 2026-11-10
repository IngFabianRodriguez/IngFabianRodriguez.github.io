import { tileCoords } from "@/domain/viz/mercator";

/** Pixels on each side of a terrain tile. */
export const TERRARIUM_SIZE = 256;

/**
 * Heights in meters of a Terrarium tile, row by row. Each pixel stores its height in the red,
 * green and blue channels as `(R * 256 + G + B / 256) - 32768`.
 */
export function decodeTerrarium(
  rgba: Uint8ClampedArray | Uint8Array,
  size = TERRARIUM_SIZE,
): Float32Array {
  const heights = new Float32Array(size * size);
  for (let i = 0; i < heights.length; i++) {
    const at = i * 4;
    heights[i] = (rgba[at] ?? 0) * 256 + (rgba[at + 1] ?? 0) + (rgba[at + 2] ?? 0) / 256 - 32768;
  }
  return heights;
}

/**
 * The heights of the terrain tiles of one zoom that have arrived, read at any point in between
 * pixels by proportion, also across the border of two tiles.
 */
export class ElevationField {
  private readonly tiles = new Map<string, Float32Array>();
  private readonly count: number;

  constructor(readonly zoom: number) {
    this.count = 2 ** zoom;
  }

  addTile(x: number, y: number, heights: Float32Array): void {
    this.tiles.set(`${x}/${y}`, heights);
  }

  has(x: number, y: number): boolean {
    return this.tiles.has(`${x}/${y}`);
  }

  /** Height in meters at a position given in tile units of this zoom, or null with no tile there. */
  heightAtTile(tx: number, ty: number): number | null {
    if (!this.has(this.wrap(Math.floor(tx)), Math.floor(ty))) return null;

    // Heights belong to the center of their pixel, so the grid is half a pixel off the tile.
    const px = tx * TERRARIUM_SIZE - 0.5;
    const py = ty * TERRARIUM_SIZE - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const fx = px - x0;
    const fy = py - y0;

    let sum = 0;
    let weights = 0;
    for (const [dx, dy, weight] of [
      [0, 0, (1 - fx) * (1 - fy)],
      [1, 0, fx * (1 - fy)],
      [0, 1, (1 - fx) * fy],
      [1, 1, fx * fy],
    ] as const) {
      const height = this.pixel(x0 + dx, y0 + dy);
      // A missing neighbour (another tile that has not arrived) leaves its share to the others.
      if (height === undefined || weight === 0) continue;
      sum += height * weight;
      weights += weight;
    }
    return weights > 0 ? sum / weights : null;
  }

  /** Height in meters at a latitude and longitude, or null with no tile there. */
  heightAt(lat: number, lon: number): number | null {
    const [tx, ty] = tileCoords(lat, lon, this.zoom);
    return this.heightAtTile(tx, ty);
  }

  private wrap(x: number): number {
    return ((x % this.count) + this.count) % this.count;
  }

  /** The height of one pixel of the whole world grid of this zoom, if its tile has arrived. */
  private pixel(gx: number, gy: number): number | undefined {
    const tileY = Math.floor(gy / TERRARIUM_SIZE);
    if (tileY < 0 || tileY >= this.count) return undefined;
    const tileX = Math.floor(gx / TERRARIUM_SIZE);
    const tile = this.tiles.get(`${this.wrap(tileX)}/${tileY}`);
    if (!tile) return undefined;
    const column = gx - tileX * TERRARIUM_SIZE;
    const row = gy - tileY * TERRARIUM_SIZE;
    return tile[row * TERRARIUM_SIZE + column];
  }
}
