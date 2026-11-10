import { keyOf, PATCH_TILES, patchSlots } from "@/domain/flyover/tilePlan";

const TILE_PX = 256;

/** Pixels on each side of the picture of the ground that is put together around the rider. */
export const PATCH_PX = PATCH_TILES * TILE_PX;

/**
 * Puts the imagery tiles of a block together on a canvas that is `PATCH_PX` wide. A tile that did
 * not arrive leaves the background colour. Gives how many tiles were drawn.
 */
export function composePatch(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  zoom: number,
  tiles: Map<string, CanvasImageSource>,
  background: string,
): number {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, PATCH_PX, PATCH_PX);

  let drawn = 0;
  for (const { tile, col, row } of patchSlots(origin, zoom)) {
    const image = tiles.get(keyOf(tile));
    if (!image) continue;
    ctx.drawImage(image, col * TILE_PX, row * TILE_PX, TILE_PX, TILE_PX);
    drawn++;
  }
  return drawn;
}

/** Where a point, given in tile units of the block's zoom, is in the picture of the block (0 to 1). */
export function patchUv(
  origin: { x: number; y: number },
  tx: number,
  ty: number,
): [number, number] {
  return [(tx - origin.x) / PATCH_TILES, (ty - origin.y) / PATCH_TILES];
}
