import type { LatLon } from "@/domain/route";
import { groundMetersPerTile, tileCoords } from "@/domain/viz/mercator";

/** Tiles on each side of the block of imagery that is put together around the rider. */
export const PATCH_TILES = 6;
/** The block starts this many tiles before the tile of the rider, so the rider is near its center. */
const TILES_BEFORE = PATCH_TILES / 2 - 1;

const METERS_PER_DEGREE_LAT = 111_320;

export interface TileKey {
  z: number;
  x: number;
  y: number;
}

export const keyOf = (tile: TileKey): string => `${tile.z}/${tile.x}/${tile.y}`;

/**
 * First tile (top left) of the block of imagery around a position. It only changes when the rider
 * goes into another tile, so the picture of the ground is put together once for a good stretch.
 */
export function patchOrigin(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const [tx, ty] = tileCoords(lat, lon, zoom);
  return { x: Math.floor(tx) - TILES_BEFORE, y: Math.floor(ty) - TILES_BEFORE };
}

function wrap(x: number, zoom: number): number {
  const count = 2 ** zoom;
  return ((x % count) + count) % count;
}

export interface PatchSlot {
  tile: TileKey;
  /** Column and row of the tile inside the block, from 0 at the top left. */
  col: number;
  row: number;
}

/** The tiles of the block that starts at `origin`, each with its place in the block. */
export function patchSlots(origin: { x: number; y: number }, zoom: number): PatchSlot[] {
  const slots: PatchSlot[] = [];
  for (let row = 0; row < PATCH_TILES; row++) {
    const y = origin.y + row;
    if (y < 0 || y >= 2 ** zoom) continue;
    for (let col = 0; col < PATCH_TILES; col++) {
      slots.push({ tile: { z: zoom, x: wrap(origin.x + col, zoom), y }, col, row });
    }
  }
  return slots;
}

/** The tiles of the block that starts at `origin`: longitude wraps, rows beyond the poles do not exist. */
export function patchTiles(origin: { x: number; y: number }, zoom: number): TileKey[] {
  const tiles = new Map<string, TileKey>();
  for (const { tile } of patchSlots(origin, zoom)) tiles.set(keyOf(tile), tile);
  return [...tiles.values()];
}

export interface TilePlan {
  zoom: number;
  tiles: TileKey[];
  /** True when even the lowest zoom needs more tiles than allowed. */
  capped: boolean;
}

interface ZoomRange {
  maxZoom: number;
  minZoom: number;
  /** The most tiles that may be asked for; a more distant zoom is used when it would be more. */
  maxTiles: number;
}

/** Tries each zoom from the most detailed down, and keeps the first that is within the limit. */
function chooseZoom(range: ZoomRange, tilesAt: (zoom: number) => TileKey[]): TilePlan {
  let plan: TilePlan = { zoom: range.maxZoom, tiles: [], capped: false };
  for (let zoom = range.maxZoom; zoom >= range.minZoom; zoom--) {
    const tiles = tilesAt(zoom);
    plan = { zoom, tiles, capped: tiles.length > range.maxTiles };
    if (!plan.capped) return plan;
  }
  return plan;
}

/** The imagery tiles for the whole flight: the block around every position, at one zoom. */
export function planImagery(positions: LatLon[], range: ZoomRange): TilePlan {
  return chooseZoom(range, (zoom) => {
    const origins = new Map<string, { x: number; y: number }>();
    for (const [lat, lon] of positions) {
      const origin = patchOrigin(lat, lon, zoom);
      origins.set(`${origin.x}/${origin.y}`, origin);
    }
    const tiles = new Map<string, TileKey>();
    for (const origin of origins.values()) {
      for (const tile of patchTiles(origin, zoom)) tiles.set(keyOf(tile), tile);
    }
    return [...tiles.values()];
  });
}

interface TerrainRange extends ZoomRange {
  /** How far from the rider the relief is needed, in meters, to every side. */
  halfExtentM: number;
}

/** The terrain tiles for the whole flight: every tile that touches the square around a position. */
export function planTerrain(positions: LatLon[], range: TerrainRange): TilePlan {
  return chooseZoom(range, (zoom) => {
    const tiles = new Map<string, TileKey>();
    const count = 2 ** zoom;
    for (const [lat, lon] of positions) {
      const dLat = range.halfExtentM / METERS_PER_DEGREE_LAT;
      const dLon = range.halfExtentM / (METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
      const [x0, y0] = tileCoords(lat + dLat, lon - dLon, zoom);
      const [x1, y1] = tileCoords(lat - dLat, lon + dLon, zoom);
      for (let y = Math.floor(y0); y <= Math.floor(y1); y++) {
        if (y < 0 || y >= count) continue;
        for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
          const tile = { z: zoom, x: wrap(x, zoom), y };
          tiles.set(keyOf(tile), tile);
        }
      }
    }
    return [...tiles.values()];
  });
}

/** The most detailed zoom at which a side of this many meters fits in three tiles of the block. */
export function overviewZoom(
  sideM: number,
  lat: number,
  range: { maxZoom: number; minZoom: number },
): number {
  for (let zoom = range.maxZoom; zoom > range.minZoom; zoom--) {
    if (sideM <= 3 * groundMetersPerTile(lat, zoom)) return zoom;
  }
  return range.minZoom;
}

/**
 * The block of imagery that has a position at its middle, for the view of the whole route. It is
 * fixed, unlike the block that follows the rider, because the overview does not move.
 */
export function centeredOrigin(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const [tx, ty] = tileCoords(lat, lon, zoom);
  return { x: Math.round(tx) - PATCH_TILES / 2, y: Math.round(ty) - PATCH_TILES / 2 };
}
