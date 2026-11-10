import type { LatLon } from "@/domain/route";

/** Side of a map tile in pixels, the same for every tile server that follows the common scheme. */
export const TILE_SIZE = 256;

/** The most latitude the Web Mercator map can show. */
const MAX_LATITUDE = 85.0511287798;

export interface BoxSize {
  width: number;
  height: number;
}

export interface FitBox extends BoxSize {
  /** Pixels kept free on every side. */
  padding: number;
}

/**
 * Which part of the world map a box shows: the zoom (it may have a fraction, so the route fills
 * the box) and the position of the top left corner of the box in world pixels at that zoom.
 */
export interface MapView {
  zoom: number;
  left: number;
  top: number;
}

export interface TilePlacement {
  z: number;
  x: number;
  y: number;
  /** Where the top left corner of the tile goes, in pixels of the box. */
  dx: number;
  dy: number;
  /** Side of the tile as drawn in the box. */
  size: number;
}

/** Position on the world map of a zoom, in pixels from its top left corner (Web Mercator). */
export function worldPixel(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const world = TILE_SIZE * 2 ** zoom;
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

/** Length of the equator, the circumference of the earth in meters. */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;

/** Meters on the ground along the side of one tile, at a latitude. */
export function groundMetersPerTile(lat: number, zoom: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

/** Position of a point in tile units of a zoom: the whole part is the tile, the rest is inside it. */
export function tileCoords(lat: number, lon: number, zoom: number): [number, number] {
  const p = worldPixel(lat, lon, zoom);
  return [p.x / TILE_SIZE, p.y / TILE_SIZE];
}

/**
 * The view that shows all the positions in a box, north up, as large as it fits and centred. Null
 * when there are no positions. `maxZoom` stops a route that is a single point from zooming in
 * until nothing is recognisable.
 */
export function fitView(positions: LatLon[], box: FitBox, maxZoom: number): MapView | null {
  if (positions.length === 0) return null;

  // Measure at zoom 0 and scale: the projection only grows by a factor of two per zoom.
  const flat = positions.map(([lat, lon]) => worldPixel(lat, lon, 0));
  const minX = Math.min(...flat.map((p) => p.x));
  const maxX = Math.max(...flat.map((p) => p.x));
  const minY = Math.min(...flat.map((p) => p.y));
  const maxY = Math.max(...flat.map((p) => p.y));

  const availableW = Math.max(1, box.width - 2 * box.padding);
  const availableH = Math.max(1, box.height - 2 * box.padding);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const fit = Math.min(
    spanX > 0 ? availableW / spanX : Infinity,
    spanY > 0 ? availableH / spanY : Infinity,
  );
  const zoom = Math.max(0, Math.min(maxZoom, Number.isFinite(fit) ? Math.log2(fit) : maxZoom));

  const scale = 2 ** zoom;
  return {
    zoom,
    left: ((minX + maxX) / 2) * scale - box.width / 2,
    top: ((minY + maxY) / 2) * scale - box.height / 2,
  };
}

/** Where a position lands in the box of the view, in pixels from its top left corner. */
export function projectToBox(view: MapView, lat: number, lon: number): { x: number; y: number } {
  const p = worldPixel(lat, lon, view.zoom);
  return { x: p.x - view.left, y: p.y - view.top };
}

/**
 * The tiles that cover the box. They come from the whole zoom just below the view and are drawn
 * a little larger, so a tile server is never asked for a zoom it may not have.
 */
export function tilesCovering(view: MapView, box: BoxSize): TilePlacement[] {
  const z = Math.floor(view.zoom);
  const size = TILE_SIZE * 2 ** (view.zoom - z);
  const count = 2 ** z;

  const first = { x: Math.floor(view.left / size), y: Math.floor(view.top / size) };
  const last = {
    x: Math.floor((view.left + box.width - 1) / size),
    y: Math.floor((view.top + box.height - 1) / size),
  };

  const tiles: TilePlacement[] = [];
  for (let y = first.y; y <= last.y; y++) {
    if (y < 0 || y >= count) continue;
    for (let x = first.x; x <= last.x; x++) {
      // Longitude wraps around the world; latitude does not.
      const wrapped = ((x % count) + count) % count;
      tiles.push({ z, x: wrapped, y, dx: x * size - view.left, dy: y * size - view.top, size });
    }
  }
  return tiles;
}
