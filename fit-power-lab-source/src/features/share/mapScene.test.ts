import { describe, expect, it, vi } from "vitest";
import type { TileConfig } from "@/lib/tiles";
import { buildMapScene, plainAttribution, tileUrl } from "@/features/share/mapScene";
import { rideOf, type Point } from "@/test/rideOf";

/** A 1 km ride in 100 s heading north-east, with GPS. */
const ride = rideOf(
  Array.from({ length: 101 }, (_, i): Point => ({
    t: i,
    distance: 10 * i,
    altitude: 100,
    speed: 10,
    lat: 4.7 + i * 1e-4,
    lon: -30.1 + i * 1e-4,
  })),
);

const box = { x: 20, y: 30, width: 600, height: 400 };
const osm: TileConfig = {
  url: "https://tile.example.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};
const none: TileConfig = { url: null, attribution: "", maxZoom: 19 };

/** A canvas that only remembers what was drawn on it. */
function fakeCanvas() {
  const draws: unknown[][] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: (...args: unknown[]) => draws.push(args) }),
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, draws };
}

const tile = { tile: true } as unknown as CanvasImageSource;

function scene(options: {
  tiles?: TileConfig;
  hideEndsM?: number;
  loadTile?: (url: string) => Promise<CanvasImageSource>;
  canvas?: HTMLCanvasElement;
}) {
  const fake = fakeCanvas();
  return buildMapScene(ride, {
    box,
    padding: 30,
    hideEndsM: options.hideEndsM ?? 0,
    tiles: options.tiles ?? osm,
    loadTile: options.loadTile ?? (() => Promise.resolve(tile)),
    createCanvas: () => options.canvas ?? fake.canvas,
  });
}

describe("buildMapScene", () => {
  it("projects the route into the box, with room left at the sides", async () => {
    const result = await scene({});

    expect(result.box).toEqual(box);
    const points = result.lines.flat();
    expect(points.length).toBe(101);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(29);
      expect(p.x).toBeLessThanOrEqual(box.width - 29);
      expect(p.y).toBeGreaterThanOrEqual(29);
      expect(p.y).toBeLessThanOrEqual(box.height - 29);
    }
  });

  it("does not project the meters hidden at the ends of the route", async () => {
    const full = await scene({});
    const hidden = await scene({ hideEndsM: 300 });

    expect(hidden.lines.flat().length).toBeLessThan(full.lines.flat().length);
    expect(hidden.lines.flat().length).toBeGreaterThan(0);
  });

  it("draws the tiles of the configured server on a backdrop of the size of the box", async () => {
    const { canvas, draws } = fakeCanvas();
    const loadTile = vi.fn(() => Promise.resolve(tile));

    const result = await scene({ canvas, loadTile });

    expect(result.backdrop).toBe(canvas);
    expect(canvas.width).toBe(box.width);
    expect(canvas.height).toBe(box.height);
    expect(loadTile).toHaveBeenCalled();
    expect(draws.length).toBe(loadTile.mock.calls.length);
    for (const [url] of loadTile.mock.calls as unknown as [string][]) {
      expect(url).toMatch(/^https:\/\/tile\.example\.org\/\d+\/\d+\/\d+\.png$/);
    }
  });

  it("asks for no tile at all when the map has no background", async () => {
    const loadTile = vi.fn(() => Promise.resolve(tile));

    const result = await scene({ tiles: none, loadTile });

    expect(loadTile).not.toHaveBeenCalled();
    expect(result.backdrop).toBeNull();
    expect(result.lines.flat().length).toBe(101);
    expect(result.attribution).toBe("");
  });

  it("keeps the tiles that arrive when some do not", async () => {
    const { canvas, draws } = fakeCanvas();
    let calls = 0;
    const loadTile = () =>
      ++calls === 1 ? Promise.reject(new Error("offline")) : Promise.resolve(tile);

    const result = await scene({ canvas, loadTile });

    expect(result.backdrop).toBe(canvas);
    expect(draws.length).toBe(calls - 1);
  });

  it("falls back to no backdrop, and still draws the route, when no tile arrives", async () => {
    const result = await scene({ loadTile: () => Promise.reject(new Error("offline")) });

    expect(result.backdrop).toBeNull();
    expect(result.lines.flat().length).toBe(101);
  });

  it("credits the tile server in plain text", async () => {
    const result = await scene({});

    expect(result.attribution).toBe("© OpenStreetMap contributors");
  });

  it("gives an empty scene to a ride without positions", async () => {
    const noGps = rideOf(
      ride.samples.map((s) => ({ t: s.t, distance: s.distance, altitude: 0, speed: 1 })),
    );
    const loadTile = vi.fn(() => Promise.resolve(tile));

    const result = await buildMapScene(noGps, {
      box,
      padding: 30,
      hideEndsM: 0,
      tiles: osm,
      loadTile,
      createCanvas: () => fakeCanvas().canvas,
    });

    expect(result.lines).toEqual([]);
    expect(result.backdrop).toBeNull();
    expect(loadTile).not.toHaveBeenCalled();
  });
});

describe("tileUrl", () => {
  it("fills the three placeholders", () => {
    expect(tileUrl("https://t.example/{z}/{x}/{y}.png", 12, 3, 4)).toBe(
      "https://t.example/12/3/4.png",
    );
  });
});

describe("plainAttribution", () => {
  it("removes the markup and the entities", () => {
    expect(plainAttribution('&copy; <a href="https://x.org">Maps</a> &amp; friends')).toBe(
      "© Maps & friends",
    );
  });
});
