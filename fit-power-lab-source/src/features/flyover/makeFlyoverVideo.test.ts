import { describe, expect, it, vi } from "vitest";
import { createTranslator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";
import {
  FLYOVER_BITRATE,
  makeFlyoverVideo,
  NoRouteError,
  type MakeVideoDeps,
  type MakeVideoOptions,
} from "@/features/flyover/makeFlyoverVideo";
import type { FlyoverSession } from "@/features/flyover/flyoverSession";
import { flyoverSupport } from "@/features/flyover/support";
import { canvasRecorder } from "@/test/canvasRecorder";
import { rideOf } from "@/test/rideOf";

const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

function fakeSession(over: Partial<FlyoverSession> = {}): FlyoverSession {
  return {
    frameCount: 1800,
    size: { width: 1080, height: 1920 },
    renderFrame: vi.fn(),
    dispose: vi.fn(),
    info: {
      imageryZoom: 15,
      imageryRequested: 10,
      imageryLoaded: 10,
      terrainZoom: 13,
      terrainRequested: 4,
      terrainLoaded: 4,
    },
    ...over,
  };
}

function setup(over: Partial<MakeVideoDeps> = {}) {
  const session = fakeSession();
  const canvas = { getContext: () => canvasRecorder().ctx } as unknown as HTMLCanvasElement;
  const createSession = vi.fn(async (o: Parameters<MakeVideoDeps["createSession"]>[0]) => {
    o.onTilesProgress?.(0.5);
    o.onTilesProgress?.(1);
    return session;
  });
  const encode = vi.fn(async (o: Parameters<MakeVideoDeps["encode"]>[0]) => {
    o.drawFrame(7);
    o.onProgress?.(0.4);
    o.onProgress?.(1);
    return bytes;
  });
  const deps: MakeVideoDeps = {
    createSession,
    encode,
    createCanvas: () => canvas,
    ...over,
  };
  return { deps, session, createSession, encode, canvas };
}

function options(over: Partial<MakeVideoOptions> = {}): MakeVideoOptions {
  return {
    ride: rideOf([]),
    watts: [],
    orientation: "vertical",
    units: "metric",
    t: createTranslator(MESSAGES, "en"),
    title: "Morning ride",
    dateText: "February 25, 2024",
    hideEndsM: 250,
    tiles: { url: "https://tiles.example.org/{z}/{x}/{y}.png", attribution: "", maxZoom: 19 },
    terrain: { url: null, attribution: "", maxZoom: 15 },
    ...over,
  };
}

describe("makeFlyoverVideo", () => {
  it("makes the flight of the ride with the choices it was given", async () => {
    const { deps, createSession } = setup();

    await makeFlyoverVideo(options({ orientation: "horizontal" }), deps);

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        orientation: "horizontal",
        hideEndsM: 250,
        title: "Morning ride",
        terrain: { url: null, attribution: "", maxZoom: 15 },
      }),
    );
  });

  it("encodes every frame of the session as one minute of video at a bitrate that is easy to share", async () => {
    const { deps, session, encode, canvas } = setup();

    const file = await makeFlyoverVideo(options(), deps);

    expect(file).toBe(bytes);
    expect(encode).toHaveBeenCalledWith(
      expect.objectContaining({
        canvas,
        size: { width: 1080, height: 1920 },
        fps: 30,
        frames: 1800,
        bitrate: FLYOVER_BITRATE,
      }),
    );
    expect(FLYOVER_BITRATE).toBe(4_000_000);
    expect(session.renderFrame).toHaveBeenCalledWith(7, expect.anything());
  });

  it("reports the loading of the tiles and then the making of the video", async () => {
    const { deps } = setup();
    const seen: [string, number][] = [];

    await makeFlyoverVideo(options({ onProgress: (stage, p) => seen.push([stage, p]) }), deps);

    expect(seen).toEqual([
      ["tiles", 0.5],
      ["tiles", 1],
      ["video", 0.4],
      ["video", 1],
    ]);
  });

  it("lets go of the session when it is done, and also when the encoding fails or is cancelled", async () => {
    const ok = setup();
    await makeFlyoverVideo(options(), ok.deps);
    expect(ok.session.dispose).toHaveBeenCalledTimes(1);

    const failing = setup({ encode: async () => Promise.reject(new Error("encoder lost")) });
    await expect(makeFlyoverVideo(options(), failing.deps)).rejects.toThrow("encoder lost");
    expect(failing.session.dispose).toHaveBeenCalledTimes(1);

    const cancelled = setup({
      encode: async () => Promise.reject(new DOMException("cancelled", "AbortError")),
    });
    await expect(makeFlyoverVideo(options(), cancelled.deps)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(cancelled.session.dispose).toHaveBeenCalledTimes(1);
  });

  it("says there is no route to fly over, and encodes nothing", async () => {
    const { deps, encode } = setup({ createSession: async () => null });

    await expect(makeFlyoverVideo(options(), deps)).rejects.toBeInstanceOf(NoRouteError);
    expect(encode).not.toHaveBeenCalled();
  });

  it("passes the cancellation on to both the tiles and the encoding", async () => {
    const { deps, createSession, encode } = setup();
    const controller = new AbortController();

    await makeFlyoverVideo(options({ signal: controller.signal }), deps);

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(encode).toHaveBeenCalledWith(expect.objectContaining({ signal: controller.signal }));
  });
});

describe("flyoverSupport", () => {
  const ok = {
    hasVideoEncoder: () => true,
    hasWebGl2: () => true,
    h264: async () => "avc1.640028",
  };

  it("is ok when the browser can draw in 3D and encode H.264", async () => {
    expect(await flyoverSupport(ok)).toBe("ok");
  });

  it("says the browser has no WebGL 2", async () => {
    expect(await flyoverSupport({ ...ok, hasWebGl2: () => false })).toBe("no-webgl");
  });

  it("says the browser cannot encode the video, with no encoder or with no H.264", async () => {
    expect(await flyoverSupport({ ...ok, hasVideoEncoder: () => false })).toBe("no-encoder");
    expect(await flyoverSupport({ ...ok, h264: async () => null })).toBe("no-encoder");
  });
});
