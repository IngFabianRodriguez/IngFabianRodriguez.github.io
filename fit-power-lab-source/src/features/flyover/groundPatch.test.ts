import { describe, expect, it } from "vitest";
import { PATCH_TILES, patchSlots } from "@/domain/flyover/tilePlan";
import { composePatch, PATCH_PX, patchUv } from "@/features/flyover/groundPatch";
import { canvasRecorder } from "@/test/canvasRecorder";

const origin = { x: 100, y: 200 };
const image = (name: string) => ({ name }) as unknown as CanvasImageSource;

describe("patchSlots", () => {
  it("places each tile of the block in its column and row", () => {
    const slots = patchSlots(origin, 14);

    expect(slots).toHaveLength(PATCH_TILES * PATCH_TILES);
    expect(slots).toContainEqual({ tile: { z: 14, x: 100, y: 200 }, col: 0, row: 0 });
    expect(slots).toContainEqual({ tile: { z: 14, x: 103, y: 202 }, col: 3, row: 2 });
  });

  it("puts the tiles that wrap around the world in the columns they appear in", () => {
    const slots = patchSlots({ x: -2, y: 0 }, 3);

    expect(slots).toContainEqual({ tile: { z: 3, x: 6, y: 0 }, col: 0, row: 0 });
    expect(slots).toContainEqual({ tile: { z: 3, x: 0, y: 0 }, col: 2, row: 0 });
  });
});

describe("composePatch", () => {
  it("paints the background, then each tile that arrived where it belongs", () => {
    const { ctx, calls } = canvasRecorder();
    const tiles = new Map([
      ["14/100/200", image("a")],
      ["14/103/202", image("b")],
    ]);

    const drawn = composePatch(ctx, origin, 14, tiles, "#cfd8dc");

    expect(drawn).toBe(2);
    expect(calls[0]).toEqual(["set fillStyle", "#cfd8dc"]);
    expect(calls[1]).toEqual(["fillRect", 0, 0, PATCH_PX, PATCH_PX]);
    expect(calls).toContainEqual(["drawImage", tiles.get("14/100/200"), 0, 0, 256, 256]);
    expect(calls).toContainEqual(["drawImage", tiles.get("14/103/202"), 768, 512, 256, 256]);
    expect(calls.filter((c) => c[0] === "drawImage")).toHaveLength(2);
  });

  it("is only the background when no tile arrived", () => {
    const { ctx, calls } = canvasRecorder();

    expect(composePatch(ctx, origin, 14, new Map(), "#fff")).toBe(0);
    expect(calls.filter((c) => c[0] === "drawImage")).toHaveLength(0);
  });

  it("is as large as the block of tiles", () => {
    expect(PATCH_PX).toBe(PATCH_TILES * 256);
  });
});

describe("patchUv", () => {
  it("gives the position of a point of the ground in the picture of the block", () => {
    expect(patchUv(origin, 100, 200)).toEqual([0, 0]);
    expect(patchUv(origin, 103, 201.5)).toEqual([0.5, 0.25]);
    expect(patchUv(origin, 106, 206)).toEqual([1, 1]);
  });
});
