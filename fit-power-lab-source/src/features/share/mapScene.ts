import type { Ride } from "@/domain/ride";
import { fitView, projectToBox, tilesCovering } from "@/domain/viz/mercator";
import type { Pt } from "@/domain/viz/miniRoute";
import { trackSegments, visiblePositions } from "@/domain/viz/tracks";
import type { TileConfig } from "@/lib/tiles";

export interface MapBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What a picture of the map needs: the route already placed in its box, and the background. */
export interface MapScene {
  box: MapBox;
  /** The route as lines, in pixels from the top left corner of the box. */
  lines: Pt[][];
  /** The map tiles already put together, as large as the box; null when there is no background. */
  backdrop: CanvasImageSource | null;
  /** Plain text to credit the tile server; empty when there is nothing to credit. */
  attribution: string;
}

export type TileLoader = (url: string) => Promise<CanvasImageSource>;

export interface SceneOptions {
  box: MapBox;
  padding: number;
  /** Meters at each end of the route that are not drawn and do not choose the tiles asked for. */
  hideEndsM: number;
  tiles: TileConfig;
  loadTile: TileLoader;
  createCanvas?: () => HTMLCanvasElement;
}

/** More tiles than this would be too many requests for one picture; the route is drawn alone. */
const MAX_TILES = 48;
/** The zoom is not taken beyond this, even if the server has more, so a short route stays readable. */
const MAX_ZOOM = 17;
const TILE_TIMEOUT_MS = 8000;

export function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

/** The attribution of a tile server is HTML for the page; on a picture it is plain text. */
export function plainAttribution(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&copy;/g, "©")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Asks the browser for one tile with permission to read its pixels (`crossOrigin`), so the picture
 * made from it can still be saved. A tile that takes too long counts as failed.
 */
export function loadTileImage(url: string): Promise<CanvasImageSource> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => reject(new Error("The tile took too long.")), TILE_TIMEOUT_MS);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error("The tile could not be loaded."));
    };
    image.src = url;
  });
}

/**
 * Puts the route of a ride on a map: the tiles of the configured server behind it and the route
 * placed in the box. Only the part of the route that is allowed to be shown is used, for the lines
 * and for choosing the tiles. The tiles that cover what is shown can still include the start, so
 * a short hidden distance does not keep that area from the tile server. Tiles that do not arrive are left out; with none, the scene has no background and the route alone.
 */
export async function buildMapScene(ride: Ride, options: SceneOptions): Promise<MapScene> {
  const { box, tiles } = options;
  const empty: MapScene = { box, lines: [], backdrop: null, attribution: "" };

  const positions = visiblePositions(ride, options.hideEndsM);
  const view = fitView(
    positions,
    { width: box.width, height: box.height, padding: options.padding },
    Math.min(tiles.maxZoom, MAX_ZOOM),
  );
  if (!view) return empty;

  const lines = trackSegments(ride, options.hideEndsM).map((segment) =>
    segment.map(([lat, lon]) => projectToBox(view, lat, lon)),
  );
  const scene: MapScene = { ...empty, lines };
  const template = tiles.url;
  if (!template) return scene;

  const placements = tilesCovering(view, box);
  if (placements.length > MAX_TILES) return scene;

  const canvas = (options.createCanvas ?? (() => document.createElement("canvas")))();
  canvas.width = box.width;
  canvas.height = box.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return scene;

  const results = await Promise.allSettled(
    placements.map(async (p) => ({
      p,
      image: await options.loadTile(tileUrl(template, p.z, p.x, p.y)),
    })),
  );
  let drawn = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { p, image } = result.value;
    ctx.drawImage(image, p.dx, p.dy, p.size, p.size);
    drawn++;
  }
  if (drawn === 0) return scene;

  return { ...scene, backdrop: canvas, attribution: plainAttribution(tiles.attribution) };
}
