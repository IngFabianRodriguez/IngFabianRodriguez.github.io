import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";
import {
  createFlyoverSession,
  WebGlUnavailableError,
  type SessionDeps,
  type SessionOptions,
} from "@/features/flyover/flyoverSession";
import type { DrawFrame, FlyoverRenderer } from "@/features/flyover/renderer";
import { rideOf, type Point } from "@/test/rideOf";
import { canvasRecorder } from "@/test/canvasRecorder";

/** About 13 km heading north in 20 minutes, with every sensor. */
function northRide(seconds = 1200, hide = 0) {
  return rideOf(
    Array.from({ length: seconds + 1 }, (_, i): Point => ({
      t: i,
      distance: 11 * i + hide,
      altitude: 800 + i * 0.1,
      speed: 11,
      cadence: 85,
      heartRate: 140,
      lat: 45 + (i * 11) / 111_320,
      lon: 7,
    })),
  );
}

const OSM = {
  url: "https://tiles.example.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};
const TERRAIN = {
  url: "https://terrain.example.org/{z}/{x}/{y}.png",
  attribution: "Terrain: Test data",
  maxZoom: 15,
};
const NONE = { url: null, attribution: "", maxZoom: 15 };

interface Fakes {
  deps: Partial<SessionDeps>;
  requested: string[];
  draws: DrawFrame[];
  renderer: {
    setGroundTexture: ReturnType<typeof vi.fn>;
    draw: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };
}

function fakes(over: Partial<SessionDeps> = {}): Fakes {
  const requested: string[] = [];
  const draws: DrawFrame[] = [];
  const renderer = {
    setGroundTexture: vi.fn(),
    draw: vi.fn((frame: DrawFrame) => draws.push(frame)),
    dispose: vi.fn(),
  };
  const flat = new Uint8ClampedArray(256 * 256 * 4);
  for (let i = 0; i < flat.length; i += 4) flat[i] = 128;
  const deps: Partial<SessionDeps> = {
    loadImage: (url) => {
      requested.push(url);
      return Promise.resolve({ url } as unknown as CanvasImageSource);
    },
    createRenderer: () => renderer as unknown as FlyoverRenderer,
    createCanvas: (width, height) =>
      ({ width, height, getContext: () => canvasRecorder().ctx }) as unknown as HTMLCanvasElement,
    readPixels: () => flat,
    ...over,
  };
  return { deps, requested, draws, renderer };
}

function options(over: Partial<SessionOptions> = {}): SessionOptions {
  return {
    ride: northRide(),
    watts: Array<number>(1201).fill(180),
    orientation: "vertical",
    units: "metric",
    t: createTranslator(MESSAGES, "en"),
    title: "Morning ride",
    dateText: "February 25, 2024",
    hideEndsM: 0,
    tiles: OSM,
    terrain: TERRAIN,
    frames: 60,
    ...over,
  };
}

describe("createFlyoverSession", () => {
  it("has a frame for each frame of the video, of the size of the orientation", async () => {
    const { deps } = fakes();

    const vertical = await createFlyoverSession(options({ deps }));
    const horizontal = await createFlyoverSession(options({ deps, orientation: "horizontal" }));

    expect(vertical?.frameCount).toBe(60);
    expect(vertical?.size).toEqual({ width: 1080, height: 1920 });
    expect(horizontal?.size).toEqual({ width: 1920, height: 1080 });
  });

  it("has nothing to fly over for a ride without positions", async () => {
    const { deps, requested } = fakes();
    const noGps = rideOf(
      northRide().samples.map((s) => ({ t: s.t, distance: s.distance, altitude: 0, speed: 1 })),
    );

    expect(await createFlyoverSession(options({ deps, ride: noGps }))).toBeNull();
    expect(requested).toEqual([]);
  });

  it("asks nothing of any server in a browser that cannot draw the result", async () => {
    const { deps, requested } = fakes({ createRenderer: () => null });

    await expect(createFlyoverSession(options({ deps }))).rejects.toBeInstanceOf(
      WebGlUnavailableError,
    );
    expect(requested).toEqual([]);
  });

  it("asks the map server and the terrain server, and only those, for tiles around the route", async () => {
    const { deps, requested } = fakes();

    const session = await createFlyoverSession(options({ deps }));

    const map = requested.filter((url) => url.startsWith("https://tiles.example.org/"));
    const terrain = requested.filter((url) => url.startsWith("https://terrain.example.org/"));
    expect(map.length + terrain.length).toBe(requested.length);
    expect(map.length).toBeGreaterThan(0);
    // Up to 240 along the route, and the block of the view of the whole route.
    expect(map.length).toBeLessThanOrEqual(240 + 36);
    expect(terrain.length).toBeGreaterThan(0);
    expect(terrain.length).toBeLessThanOrEqual(120);
    expect(session?.info).toMatchObject({
      imageryRequested: map.length,
      imageryLoaded: map.length,
      terrainRequested: terrain.length,
      terrainLoaded: terrain.length,
    });
  });

  it("asks for no map when the map has no background, and for no relief when it has none", async () => {
    const noMap = fakes();
    const noRelief = fakes();
    const nothing = fakes();

    await createFlyoverSession(options({ deps: noMap.deps, tiles: NONE }));
    await createFlyoverSession(options({ deps: noRelief.deps, terrain: NONE }));
    const session = await createFlyoverSession(
      options({ deps: nothing.deps, tiles: NONE, terrain: NONE }),
    );

    expect(noMap.requested.every((url) => url.startsWith("https://terrain.example.org/"))).toBe(
      true,
    );
    expect(noRelief.requested.every((url) => url.startsWith("https://tiles.example.org/"))).toBe(
      true,
    );
    expect(nothing.requested).toEqual([]);
    // The flight still can be painted.
    const { ctx } = canvasRecorder();
    session?.renderFrame(10, ctx);
    expect(nothing.draws).toHaveLength(1);
  });

  it("does not ask for the area of the hidden ends of the route", async () => {
    const all = fakes();
    const hidden = fakes();

    await createFlyoverSession(options({ deps: all.deps }));
    await createFlyoverSession(options({ deps: hidden.deps, hideEndsM: 5000 }));

    const withEnds = new Set(all.requested);
    const withoutEnds = new Set(hidden.requested);
    expect(withoutEnds.size).toBeLessThan(withEnds.size);
    // The hidden part is the first 5 km: tiles only it needs are not asked for, but the blocks around
    // the visible positions still reach into it, so a short hidden distance does not keep the area.
    const missing = [...withEnds].filter((url) => !withoutEnds.has(url));
    expect(missing.length).toBeGreaterThan(0);
  });

  it("reports the progress of the tiles from 0 to 1", async () => {
    const { deps } = fakes();
    const seen: number[] = [];

    await createFlyoverSession(options({ deps, onTilesProgress: (p) => seen.push(p) }));

    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(1);
    expect(seen.every((p, i) => i === 0 || p >= (seen[i - 1] ?? 0))).toBe(true);
  });

  it("lets go of the renderer and rejects when it is cancelled while the tiles load", async () => {
    const controller = new AbortController();
    const { deps, renderer } = fakes({
      loadImage: async () => {
        controller.abort();
        return {} as CanvasImageSource;
      },
    });

    await expect(
      createFlyoverSession(options({ deps, signal: controller.signal })),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it("lets go of the renderer when the session is disposed", async () => {
    const { deps, renderer } = fakes();

    const session = await createFlyoverSession(options({ deps }));
    session?.dispose();

    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});

describe("renderFrame", () => {
  it("draws the terrain and the route of the frame, then the overlay with the readings", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));
    const { ctx, calls } = canvasRecorder();

    session?.renderFrame(30, ctx);

    expect(draws).toHaveLength(1);
    const frame = draws[0];
    expect(frame?.mesh.positions).toHaveLength(161 * 161 * 3);
    expect(frame?.ribbon.vertexCount).toBeGreaterThan(0);
    expect(Array.from(frame?.viewProjection ?? []).every(Number.isFinite)).toBe(true);
    const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(texts).toEqual(
      expect.arrayContaining(["Speed", "39.6", "Power (est.)", "180", "Morning ride"]),
    );
  });

  it("credits the map and the terrain data, and only data that arrived", async () => {
    const withData = fakes();
    const withoutData = fakes({ loadImage: () => Promise.reject(new Error("offline")) });
    const first = await createFlyoverSession(options({ deps: withData.deps }));
    const second = await createFlyoverSession(options({ deps: withoutData.deps }));
    const a = canvasRecorder();
    const b = canvasRecorder();

    first?.renderFrame(5, a.ctx);
    second?.renderFrame(5, b.ctx);

    const textsA = a.calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    const textsB = b.calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(textsA).toContain("© OpenStreetMap contributors · Terrain: Test data");
    expect(textsB.some((t) => String(t).includes("Terrain") || String(t).includes("©"))).toBe(
      false,
    );
    expect(second?.info).toMatchObject({ imageryLoaded: 0, terrainLoaded: 0 });
  });

  it("puts the ground picture in the renderer once for a stretch, and again in the next one", async () => {
    const { deps, renderer } = fakes();
    const session = await createFlyoverSession(options({ deps }));
    const { ctx } = canvasRecorder();

    // The first frames of the flight (6 of opening before them), then one at the end of it.
    session?.renderFrame(6, ctx);
    session?.renderFrame(7, ctx);
    const after = renderer.setGroundTexture.mock.calls.length;
    session?.renderFrame(52, ctx);

    expect(after).toBe(1);
    expect(renderer.setGroundTexture.mock.calls.length).toBeGreaterThan(1);
  });

  it("looks from behind the rider: the camera is behind and above", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));

    session?.renderFrame(30, canvasRecorder().ctx);

    const eye = draws[0]?.eye;
    // Heading north the camera is to the south (positive z) and above the rider.
    expect(eye?.z).toBeGreaterThan(100);
    expect(eye?.y).toBeGreaterThan(100);
    expect(Math.abs(eye?.x ?? 99)).toBeLessThan(5);
  });
});

/** Frames of the test video: 6 of opening, 47 of flight and 7 of closing. */
const OPENING = 6;
const LAST = 59;

describe("the opening, the flight and the closing", () => {
  const eyeHeights = async (frames: number[]) => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));
    return frames.map((k) => {
      session?.renderFrame(k, canvasRecorder().ctx);
      return draws.at(-1)?.eye.y ?? NaN;
    });
  };

  it("starts high above the whole route, comes down to the rider and goes back up at the end", async () => {
    const [start, firstOfFlight, middle, lastOfFlight, end] = await eyeHeights([
      0,
      OPENING,
      30,
      OPENING + 46,
      LAST,
    ]);

    expect(start).toBeGreaterThan(5000);
    expect(firstOfFlight).toBeLessThan(1600);
    expect(middle).toBeLessThan(1600);
    expect(lastOfFlight).toBeLessThan(1600);
    expect(end).toBeGreaterThan(5000);
    expect(start ?? 0).toBeGreaterThan((firstOfFlight ?? 1) * 4);
  });

  it("comes down gradually through the opening and goes up gradually through the closing", async () => {
    const down = await eyeHeights([0, 1, 2, 3, 4, 5, OPENING]);
    const up = await eyeHeights([OPENING + 46, OPENING + 47, 55, 56, 57, 58, LAST]);

    for (let i = 1; i < down.length; i++) expect(down[i]).toBeLessThan(down[i - 1] ?? 0);
    for (let i = 1; i < up.length; i++) expect(up[i]).toBeGreaterThan(up[i - 1] ?? Infinity);
  });

  it("looks from a little higher and further than before while it follows the rider", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));

    session?.renderFrame(30, canvasRecorder().ctx);

    const eye = draws[0]?.eye;
    // North-bound: the camera is to the south and above, at about 1300 m in all.
    expect(eye?.z).toBeGreaterThan(900);
    expect(eye?.y).toBeGreaterThan(600);
    const distance = Math.hypot(eye?.x ?? 0, eye?.y ?? 0, eye?.z ?? 0);
    expect(distance).toBeGreaterThan(1200);
    expect(distance).toBeLessThan(1500);
  });

  it("shows nothing of the route ridden at the start and all of it ridden at the end", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));
    const colorsOf = (k: number) => {
      session?.renderFrame(k, canvasRecorder().ctx);
      const colors = draws.at(-1)?.ribbon.colors ?? new Float32Array();
      const vertices: number[][] = [];
      for (let i = 0; i < colors.length; i += 4) vertices.push(Array.from(colors.slice(i, i + 4)));
      return vertices;
    };
    const done = (c: number[]) => Math.abs((c[2] ?? 0) - 0.97) < 0.01;

    const atStart = colorsOf(0);
    const atEnd = colorsOf(LAST);

    expect(atStart.length).toBeGreaterThan(0);
    expect(atStart.filter(done).length / atStart.length).toBeLessThan(0.05);
    expect(atEnd.length).toBeGreaterThan(0);
    expect(atEnd.every(done)).toBe(true);
  });

  it("draws the whole route in the overview, much more of it than around the rider", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));

    session?.renderFrame(0, canvasRecorder().ctx);
    session?.renderFrame(30, canvasRecorder().ctx);

    expect(draws[0]?.ribbon.vertexCount).toBeGreaterThan((draws[1]?.ribbon.vertexCount ?? 0) * 1.5);
  });

  it("draws both pictures of the ground, one over the other, while it changes from one to the other", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps }));

    const draw = (k: number) => {
      const before = draws.length;
      const { ctx, calls } = canvasRecorder();
      session?.renderFrame(k, ctx);
      return { layers: draws.length - before, calls };
    };

    expect(draw(0).layers).toBe(1);
    expect(draw(OPENING + 20).layers).toBe(1);
    const mixing = draw(4);
    expect(mixing.layers).toBe(2);
    const alphas = mixing.calls.filter((c) => c[0] === "set globalAlpha").map((c) => Number(c[1]));
    expect(alphas.some((a) => a > 0 && a < 1)).toBe(true);
    expect(alphas.at(-1)).toBe(1);
  });

  it("puts each picture of the ground in the renderer only when it has to", async () => {
    const { deps, renderer } = fakes();
    const session = await createFlyoverSession(options({ deps }));
    const { ctx } = canvasRecorder();

    session?.renderFrame(0, ctx);
    session?.renderFrame(1, ctx);
    const afterOverview = renderer.setGroundTexture.mock.calls.length;
    session?.renderFrame(OPENING + 5, ctx);
    session?.renderFrame(OPENING + 6, ctx);
    const afterChase = renderer.setGroundTexture.mock.calls.length;

    expect(afterOverview).toBe(1);
    expect(afterChase).toBe(2);
    expect(renderer.setGroundTexture.mock.calls[0]?.[0]).not.toBe(
      renderer.setGroundTexture.mock.calls[1]?.[0],
    );
  });

  it("asks for the tiles of the view of the whole route at a lower zoom than the ones along it", async () => {
    const { deps, requested } = fakes();

    const session = await createFlyoverSession(options({ deps }));

    const zooms = new Set(
      requested
        .filter((url) => url.startsWith("https://tiles.example.org/"))
        .map((url) => Number(/\/(\d+)\/\d+\/\d+\.png$/.exec(url)?.[1])),
    );
    expect(session?.info.imageryZoom).toBe(14);
    expect(session?.info.overviewImageryZoom).toBe(12);
    expect(zooms).toEqual(new Set([12, 14]));
  });

  it("shows the progress of the whole video, not of the flight, on the bar of the overlay", async () => {
    const { deps } = fakes();
    const session = await createFlyoverSession(options({ deps }));
    const barWidth = (k: number) => {
      const { ctx, calls } = canvasRecorder();
      session?.renderFrame(k, ctx);
      return calls.filter((c) => c[0] === "fillRect" && c[4] === 10 && c[2] === 1910).at(-1)?.[3];
    };

    expect(barWidth(0)).toBe(0);
    expect(barWidth(LAST)).toBe(1080);
    expect(barWidth(30)).toBeCloseTo((1080 * 30) / 59, 3);
  });

  it("is only the flight when the video has too few frames for an opening and a closing", async () => {
    const { deps, draws } = fakes();
    const session = await createFlyoverSession(options({ deps, frames: 20 }));

    session?.renderFrame(0, canvasRecorder().ctx);
    session?.renderFrame(19, canvasRecorder().ctx);

    expect(session?.frameCount).toBe(20);
    expect(draws).toHaveLength(2);
    for (const frame of draws) expect(frame.eye.y).toBeLessThan(1600);
  });

  it("makes a video of the length asked for", async () => {
    const { deps } = fakes();

    const session = await createFlyoverSession(options({ deps, frames: 9000 }));

    expect(session?.frameCount).toBe(9000);
  });
});
