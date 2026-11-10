import { describe, expect, it, vi } from "vitest";
import { keyOf, type TileKey } from "@/domain/flyover/tilePlan";
import { TERRARIUM_SIZE } from "@/domain/flyover/terrarium";
import { imageryLoader, loadTiles, terrainLoader } from "@/features/flyover/tileStore";

const keys: TileKey[] = Array.from({ length: 20 }, (_, i) => ({ z: 14, x: i, y: 5 }));

describe("loadTiles", () => {
  it("loads every tile and gives them by key", async () => {
    const tiles = await loadTiles(keys, (key) => Promise.resolve(`tile ${keyOf(key)}`), {
      concurrency: 4,
    });

    expect(tiles.size).toBe(20);
    expect(tiles.get("14/3/5")).toBe("tile 14/3/5");
  });

  it("never has more tiles in flight than the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const load = async () => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight--;
      return "tile";
    };

    await loadTiles(keys, load, { concurrency: 3 });

    expect(peak).toBe(3);
  });

  it("leaves out the tiles that fail and keeps the rest", async () => {
    const load = (key: TileKey) =>
      key.x % 5 === 0 ? Promise.reject(new Error("offline")) : Promise.resolve("ok");

    const tiles = await loadTiles(keys, load, { concurrency: 4 });

    expect(tiles.size).toBe(16);
    expect(tiles.has("14/0/5")).toBe(false);
    expect(tiles.has("14/1/5")).toBe(true);
  });

  it("reports how many tiles are done, failed ones included", async () => {
    const seen: number[] = [];
    const load = (key: TileKey) =>
      key.x === 0 ? Promise.reject(new Error("offline")) : Promise.resolve("ok");

    await loadTiles(keys, load, {
      concurrency: 2,
      onProgress: (done, total) => seen.push(done / total),
    });

    expect(seen).toHaveLength(20);
    expect(seen.at(-1)).toBe(1);
    expect(seen.every((p, i) => i === 0 || p >= (seen[i - 1] ?? 0))).toBe(true);
  });

  it("stops asking for tiles and rejects when it is cancelled", async () => {
    const controller = new AbortController();
    const load = vi.fn(async (key: TileKey) => {
      if (key.x === 3) controller.abort();
      await new Promise((resolve) => setTimeout(resolve, 1));
      return "ok";
    });

    await expect(
      loadTiles(keys, load, { concurrency: 1, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(load.mock.calls.length).toBeLessThan(10);
  });

  it("gives nothing for no tiles", async () => {
    expect((await loadTiles([], () => Promise.resolve("x"), { concurrency: 4 })).size).toBe(0);
  });
});

describe("imageryLoader", () => {
  it("asks the tile server of the template for the tile", async () => {
    const image = { image: true } as unknown as CanvasImageSource;
    const loadImage = vi.fn(() => Promise.resolve(image));

    const tile = await imageryLoader(
      "https://tiles.example.org/{z}/{x}/{y}.png",
      loadImage,
    )({
      z: 14,
      x: 8500,
      y: 5800,
    });

    expect(loadImage).toHaveBeenCalledWith("https://tiles.example.org/14/8500/5800.png");
    expect(tile).toBe(image);
  });
});

describe("terrainLoader", () => {
  it("asks for the tile and gives its heights in meters", async () => {
    const image = { image: true } as unknown as CanvasImageSource;
    const loadImage = vi.fn(() => Promise.resolve(image));
    const rgba = new Uint8ClampedArray(TERRARIUM_SIZE * TERRARIUM_SIZE * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 128;
      rgba[i + 1] = 25;
    }
    const readPixels = vi.fn(() => rgba);

    const heights = await terrainLoader(
      "https://terrain.example.org/{z}/{x}/{y}.png",
      loadImage,
      readPixels,
    )({ z: 12, x: 2132, y: 1993 });

    expect(loadImage).toHaveBeenCalledWith("https://terrain.example.org/12/2132/1993.png");
    expect(readPixels).toHaveBeenCalledWith(image);
    expect(heights).toHaveLength(TERRARIUM_SIZE * TERRARIUM_SIZE);
    expect(heights[0]).toBe(25);
  });
});
