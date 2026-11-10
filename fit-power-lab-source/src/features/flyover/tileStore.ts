import { decodeTerrarium, TERRARIUM_SIZE } from "@/domain/flyover/terrarium";
import { keyOf, type TileKey } from "@/domain/flyover/tilePlan";
import { tileUrl, type TileLoader } from "@/features/share/mapScene";

interface LoadOptions {
  /** Tiles asked of the server at the same time. */
  concurrency: number;
  /** Called after every tile, loaded or not, with how many are done and how many there are. */
  onProgress?: (done: number, total: number) => void;
  /** Aborting it stops asking for tiles and rejects with an `AbortError`. */
  signal?: AbortSignal;
}

/**
 * Loads tiles a few at a time and gives the ones that arrived by key. A tile that fails is left
 * out: the picture is made with what there is, and a hole is better than no video.
 */
export async function loadTiles<T>(
  keys: TileKey[],
  load: (key: TileKey) => Promise<T>,
  options: LoadOptions,
): Promise<Map<string, T>> {
  const tiles = new Map<string, T>();
  let next = 0;
  let done = 0;

  async function worker(): Promise<void> {
    while (next < keys.length && !options.signal?.aborted) {
      const key = keys[next++];
      if (!key) return;
      try {
        tiles.set(keyOf(key), await load(key));
      } catch {
        // Left out on purpose; see above.
      }
      options.onProgress?.(++done, keys.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(options.concurrency, keys.length) }, worker));
  if (options.signal?.aborted) throw new DOMException("The tiles were cancelled.", "AbortError");
  return tiles;
}

/** A loader of map imagery tiles from a tile server template. */
export function imageryLoader(
  template: string,
  loadImage: (url: string) => Promise<CanvasImageSource>,
): (key: TileKey) => Promise<CanvasImageSource> {
  return (key) => loadImage(tileUrl(template, key.z, key.x, key.y));
}

/** The pixels of a tile image, read back from a canvas (which needs the image to allow it). */
export function readPixelsFromCanvas(image: CanvasImageSource): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = TERRARIUM_SIZE;
  canvas.height = TERRARIUM_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("The browser has no 2D canvas.");
  ctx.drawImage(image, 0, 0, TERRARIUM_SIZE, TERRARIUM_SIZE);
  return ctx.getImageData(0, 0, TERRARIUM_SIZE, TERRARIUM_SIZE).data;
}

/** A loader of terrain tiles: the heights in meters of each tile of a Terrarium server. */
export function terrainLoader(
  template: string,
  loadImage: (url: string) => Promise<CanvasImageSource>,
  readPixels: (image: CanvasImageSource) => Uint8ClampedArray = readPixelsFromCanvas,
): (key: TileKey) => Promise<Float32Array> {
  return async (key) => {
    const image = await loadImage(tileUrl(template, key.z, key.x, key.y));
    return decodeTerrarium(readPixels(image));
  };
}

export type { TileLoader };
