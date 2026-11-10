import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeServiceWorker } from "@/features/offline/fakeServiceWorker";
import {
  clearTileCache,
  getCacheStats,
  precacheApp,
  registerServiceWorker,
} from "@/lib/serviceWorker";

let fake: ReturnType<typeof installFakeServiceWorker> | null = null;

afterEach(() => {
  fake?.restore();
  fake = null;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("registerServiceWorker", () => {
  it("does nothing outside a production build", async () => {
    fake = installFakeServiceWorker();

    expect(await registerServiceWorker()).toBe("disabled");
    expect(fake.register).not.toHaveBeenCalled();
  });

  it("reports an unsupported browser on a production build", async () => {
    vi.stubEnv("PROD", true);

    expect(await registerServiceWorker()).toBe("unsupported");
  });

  it("registers /sw.js with the site root as scope on a production build", async () => {
    vi.stubEnv("PROD", true);
    fake = installFakeServiceWorker();

    expect(await registerServiceWorker()).toBe("registered");
    expect(fake.register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  });

  it("reports unsupported when the browser refuses the registration", async () => {
    vi.stubEnv("PROD", true);
    fake = installFakeServiceWorker();
    fake.register.mockRejectedValueOnce(new Error("insecure context"));

    expect(await registerServiceWorker()).toBe("unsupported");
  });
});

describe("getCacheStats", () => {
  it("returns what the worker holds", async () => {
    fake = installFakeServiceWorker({ state: { shell: 1, assets: 4, tiles: 12 } });

    expect(await getCacheStats()).toEqual({ shell: 1, assets: 4, tiles: 12, tileLimit: 1500 });
    expect(fake.received).toEqual([{ type: "cache-stats" }]);
  });

  it("is null without service worker support", async () => {
    expect(await getCacheStats()).toBeNull();
  });

  it("is null when no worker was registered", async () => {
    fake = installFakeServiceWorker({ registered: false });

    expect(await getCacheStats()).toBeNull();
  });

  it("is null when the worker does not answer in time", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fake = installFakeServiceWorker({ silent: true });

    const pending = getCacheStats();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toBeNull();
  });

  it("is null when the answer is not a set of counts", async () => {
    fake = installFakeServiceWorker();
    fake.state.tiles = "many" as unknown as number;

    expect(await getCacheStats()).toBeNull();
  });
});

describe("clearTileCache", () => {
  it("asks the worker to drop the saved tiles and returns how many it removed", async () => {
    fake = installFakeServiceWorker({ state: { tiles: 9 } });

    expect(await clearTileCache()).toBe(9);
    expect(fake.received).toEqual([{ type: "clear-tiles" }]);
    expect(await getCacheStats()).toMatchObject({ tiles: 0 });
  });

  it("is null without a worker", async () => {
    expect(await clearTileCache()).toBeNull();
  });
});

describe("precacheApp", () => {
  it("asks the worker to save the app files again and returns the new counts", async () => {
    fake = installFakeServiceWorker({ state: { shell: 0, assets: 0, tiles: 0 } });

    expect(await precacheApp()).toEqual({ shell: 1, assets: 5, tiles: 0, tileLimit: 1500 });
    expect(fake.received).toEqual([{ type: "precache" }]);
  });

  it("is null without a worker", async () => {
    expect(await precacheApp()).toBeNull();
  });
});
