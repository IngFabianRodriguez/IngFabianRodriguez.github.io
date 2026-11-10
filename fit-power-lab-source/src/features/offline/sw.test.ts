import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SCOPE = "https://app.test/";
// Vitest runs from the project root; jsdom replaces `import.meta.url` and `URL`.
const SW_SOURCE = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

const OSM_TILE = "https://tile.openstreetmap.org/12/1203/1540.png";
const OWN_TILE = "https://tiles.example.org/styles/light/9/100/200.png?key=abc";

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
  destination: string;
}

const get = (url: string, over: Partial<FakeRequest> = {}): FakeRequest => ({
  url,
  method: "GET",
  mode: "no-cors",
  destination: "",
  ...over,
});
const navigate = (url = SCOPE) => get(url, { mode: "navigate", destination: "document" });
const image = (url: string) => get(url, { destination: "image" });
const script = (url: string) => get(url, { mode: "cors", destination: "script" });

/** In-memory Cache that keeps insertion order, like the real one. */
class FakeCache {
  readonly entries = new Map<string, Response>();
  async match(request: string | { url: string }) {
    const hit = this.entries.get(typeof request === "string" ? request : request.url);
    return hit ? hit.clone() : undefined;
  }
  async put(request: string | { url: string }, response: Response) {
    this.entries.set(typeof request === "string" ? request : request.url, response);
  }
  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }));
  }
  async delete(request: string | { url: string }) {
    return this.entries.delete(typeof request === "string" ? request : request.url);
  }
}

class FakeCacheStorage {
  readonly stores = new Map<string, FakeCache>();
  async open(name: string) {
    let cache = this.stores.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.stores.set(name, cache);
    }
    return cache;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
}

type Reply = () => Response | Promise<Response>;

const SHELL_HTML =
  '<!doctype html><script type="module" src="/assets/index-a1.js"></script>' +
  '<link rel="stylesheet" href="/assets/index-b2.css">';

/** Evaluates public/sw.js in a fake service worker global and drives its events. */
function createWorker() {
  const storage = new FakeCacheStorage();
  const routes = new Map<string, Reply>();
  const fetchCalls: { url: string; init?: RequestInit }[] = [];
  let online = true;
  const listeners = new Map<string, (event: unknown) => void>();
  const skipWaiting = vi.fn(async () => {});
  const claim = vi.fn(async () => {});

  const fakeFetch = async (input: string | { url: string }, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.url;
    fetchCalls.push(init ? { url, init } : { url });
    if (!online) throw new TypeError("Failed to fetch");
    const reply = routes.get(url);
    if (!reply) return new Response("not found", { status: 404 });
    return reply();
  };

  const sandbox: Record<string, unknown> = {
    caches: storage,
    fetch: fakeFetch,
    URL,
    Response,
    Promise,
    registration: { scope: SCOPE },
    clients: { claim },
    skipWaiting,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener);
    },
  };
  sandbox.self = sandbox;
  vm.runInNewContext(SW_SOURCE, sandbox);

  async function lifecycle(type: "install" | "activate") {
    const waits: Promise<unknown>[] = [];
    listeners.get(type)?.({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  }

  /** Resolves with the response the worker chose, or null when it left the request alone. */
  async function request(req: FakeRequest): Promise<Response | null> {
    let answer: Promise<Response> | undefined;
    listeners.get("fetch")?.({
      request: req,
      respondWith: (p: Promise<Response>) => {
        answer = p;
      },
      waitUntil: () => {},
    });
    return answer ? answer : null;
  }

  async function send(data: unknown): Promise<unknown> {
    const replies: unknown[] = [];
    const waits: Promise<unknown>[] = [];
    listeners.get("message")?.({
      data,
      ports: [{ postMessage: (body: unknown) => replies.push(body) }],
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    await Promise.all(waits);
    return replies[0];
  }

  const cacheOf = async (name: string) => (await storage.open(name)).entries;

  return {
    storage,
    routes,
    fetchCalls,
    skipWaiting,
    claim,
    lifecycle,
    request,
    send,
    cacheOf,
    setOnline: (value: boolean) => {
      online = value;
    },
    serve: (url: string, body: string, init?: ResponseInit) => {
      routes.set(url, () => new Response(body, init));
    },
  };
}

type Worker = ReturnType<typeof createWorker>;

function serveApp(worker: Worker) {
  worker.serve(SCOPE, SHELL_HTML, { headers: { "content-type": "text/html" } });
  worker.serve(
    `${SCOPE}assets/index-a1.js`,
    'const m=()=>import("./Map-c3.js");const d=["assets/Charts-e5.js"];',
  );
  worker.serve(`${SCOPE}assets/index-b2.css`, "@font-face{src:url(/assets/geist-d4.woff2)}");
  worker.serve(`${SCOPE}assets/Map-c3.js`, "export const map=1;");
  worker.serve(`${SCOPE}assets/Charts-e5.js`, "export const charts=1;");
  worker.serve(`${SCOPE}assets/geist-d4.woff2`, "font");
  worker.serve(`${SCOPE}icon.svg`, "<svg/>");
  worker.serve(`${SCOPE}manifest.webmanifest`, "{}");
}

describe("service worker: install and update", () => {
  let worker: Worker;
  beforeEach(() => {
    worker = createWorker();
  });

  it("keeps the page and every file it references, lazy chunks and fonts included", async () => {
    serveApp(worker);

    await worker.lifecycle("install");

    expect([...(await worker.cacheOf("fitpower-shell-v1")).keys()].sort()).toEqual(
      [SCOPE, `${SCOPE}icon.svg`, `${SCOPE}manifest.webmanifest`].sort(),
    );
    expect([...(await worker.cacheOf("fitpower-assets-v1")).keys()].sort()).toEqual(
      [
        `${SCOPE}assets/Charts-e5.js`,
        `${SCOPE}assets/Map-c3.js`,
        `${SCOPE}assets/geist-d4.woff2`,
        `${SCOPE}assets/index-a1.js`,
        `${SCOPE}assets/index-b2.css`,
      ].sort(),
    );
  });

  it("takes over without waiting for old tabs to close", async () => {
    serveApp(worker);

    await worker.lifecycle("install");
    await worker.lifecycle("activate");

    expect(worker.skipWaiting).toHaveBeenCalledTimes(1);
    expect(worker.claim).toHaveBeenCalledTimes(1);
  });

  it("still installs when the files cannot be fetched", async () => {
    worker.setOnline(false);

    await expect(worker.lifecycle("install")).resolves.toBeUndefined();
    expect(await worker.cacheOf("fitpower-shell-v1")).toHaveProperty("size", 0);
  });

  it("does not keep files from a page that answers with an error", async () => {
    worker.serve(SCOPE, "boom", { status: 500 });

    await worker.lifecycle("install");

    expect(await worker.cacheOf("fitpower-shell-v1")).toHaveProperty("size", 0);
    expect(await worker.cacheOf("fitpower-assets-v1")).toHaveProperty("size", 0);
  });

  it("removes its own caches from older versions and leaves other caches alone", async () => {
    await worker.storage.open("fitpower-shell-v0");
    await worker.storage.open("fitpower-tiles-v0");
    await worker.storage.open("fitpower-assets-v1");
    await worker.storage.open("someone-elses-cache");

    await worker.lifecycle("activate");

    expect((await worker.storage.keys()).sort()).toEqual([
      "fitpower-assets-v1",
      "someone-elses-cache",
    ]);
  });
});

describe("service worker: routing", () => {
  let worker: Worker;
  beforeEach(async () => {
    worker = createWorker();
    serveApp(worker);
    await worker.lifecycle("install");
  });

  it("opens the page from the network when online and refreshes the saved copy", async () => {
    worker.serve(SCOPE, "<!doctype html>new", { headers: { "content-type": "text/html" } });

    const response = await worker.request(navigate());

    expect(await response?.text()).toBe("<!doctype html>new");
    const saved = (await worker.cacheOf("fitpower-shell-v1")).get(SCOPE);
    expect(await saved?.text()).toBe("<!doctype html>new");
  });

  it("serves the icon and the manifest from the saved copy when offline", async () => {
    worker.setOnline(false);

    const icon = await worker.request(image(`${SCOPE}icon.svg`));
    const manifest = await worker.request(
      get(`${SCOPE}manifest.webmanifest`, { mode: "cors", destination: "manifest" }),
    );

    expect(await icon?.text()).toBe("<svg/>");
    expect(await manifest?.text()).toBe("{}");
  });

  it("takes a newer icon from the network and keeps it for the next time offline", async () => {
    worker.serve(`${SCOPE}icon.svg`, "<svg>new</svg>");

    const online = await worker.request(image(`${SCOPE}icon.svg`));
    worker.setOnline(false);
    const offline = await worker.request(image(`${SCOPE}icon.svg`));

    expect(await online?.text()).toBe("<svg>new</svg>");
    expect(await offline?.text()).toBe("<svg>new</svg>");
  });

  it("opens the saved page when offline, for the start page and for any other address", async () => {
    worker.setOnline(false);

    const start = await worker.request(navigate());
    const deep = await worker.request(navigate(`${SCOPE}rides/1`));

    expect(await start?.text()).toBe(SHELL_HTML);
    expect(await deep?.text()).toBe(SHELL_HTML);
  });

  it("does not save a page that answers with an error", async () => {
    worker.serve(SCOPE, "down", { status: 503 });

    const response = await worker.request(navigate());
    expect(response?.status).toBe(503);

    const saved = (await worker.cacheOf("fitpower-shell-v1")).get(SCOPE);
    expect(await saved?.text()).toBe(SHELL_HTML);
  });

  it("fails the navigation when offline and nothing was ever saved", async () => {
    const empty = createWorker();
    empty.setOnline(false);

    await expect(empty.request(navigate())).rejects.toThrow("Failed to fetch");
  });

  it("serves hashed files from the saved copy without asking the network", async () => {
    worker.setOnline(false);
    const before = worker.fetchCalls.length;

    const response = await worker.request(script(`${SCOPE}assets/index-a1.js`));

    expect(await response?.text()).toContain("Map-c3.js");
    expect(worker.fetchCalls.length).toBe(before);
  });

  it("saves a hashed file the first time it is used and never saves an error", async () => {
    worker.serve(`${SCOPE}assets/New-f6.js`, "export const x=1;");

    await worker.request(script(`${SCOPE}assets/New-f6.js`));
    await worker.request(script(`${SCOPE}assets/Missing-g7.js`));

    const assets = await worker.cacheOf("fitpower-assets-v1");
    expect(assets.has(`${SCOPE}assets/New-f6.js`)).toBe(true);
    expect(assets.has(`${SCOPE}assets/Missing-g7.js`)).toBe(false);
  });

  it.each([
    ["a write", get(`${SCOPE}assets/index-a1.js`, { method: "POST" })],
    ["a file outside assets", get(`${SCOPE}robots.txt`)],
    ["another site's API", get("https://elevation.example.org/api/lookup?locations=1,2")],
    ["an image that is not a map tile", image("https://cdn.example.org/logo.png")],
    ["a tile-shaped address that the page did not ask for as an image", get(OSM_TILE)],
  ])("leaves %s alone", async (_name, req) => {
    expect(await worker.request(req)).toBeNull();
  });
});

describe("service worker: map tiles", () => {
  let worker: Worker;
  beforeEach(() => {
    worker = createWorker();
    worker.serve(OSM_TILE, "osm-tile");
    worker.serve(OWN_TILE, "own-tile");
  });

  it("keeps a tile the page asked for and serves it later without a connection", async () => {
    const online = await worker.request(image(OSM_TILE));
    expect(await online?.text()).toBe("osm-tile");

    worker.setOnline(false);
    const offline = await worker.request(image(OSM_TILE));

    expect(await offline?.text()).toBe("osm-tile");
  });

  it("keeps tiles from the user's own tile server, whatever its host", async () => {
    await worker.request(image(OWN_TILE));

    expect((await worker.cacheOf("fitpower-tiles-v1")).has(OWN_TILE)).toBe(true);
  });

  it("recognises @2x and other image tile names", async () => {
    for (const url of [
      "https://t.example.org/5/10/11@2x.png",
      "https://t.example.org/5/10/12.jpg",
      "https://t.example.org/5/10/13",
    ]) {
      worker.serve(url, "t");
      await worker.request(image(url));
    }

    expect((await worker.cacheOf("fitpower-tiles-v1")).size).toBe(3);
  });

  it("asks for the tile without credentials so the answer can be read and kept", async () => {
    await worker.request(image(OSM_TILE));

    expect(worker.fetchCalls[0]).toEqual({
      url: OSM_TILE,
      init: { mode: "cors", credentials: "omit" },
    });
  });

  it("does not keep a tile the server refused", async () => {
    worker.routes.set(OSM_TILE, () => new Response("slow down", { status: 429 }));

    const response = await worker.request(image(OSM_TILE));

    expect(response?.status).toBe(429);
    expect((await worker.cacheOf("fitpower-tiles-v1")).size).toBe(0);
  });

  it("falls back to a plain request for a server without CORS and remembers that host", async () => {
    const noCors = "https://nocors.example.org/3/4/5.png";
    const noCorsNext = "https://nocors.example.org/3/4/6.png";
    worker.serve(noCorsNext, "tile");
    // The first, CORS-mode request fails; the plain one works.
    let first = true;
    worker.routes.set(noCors, () => {
      if (first) {
        first = false;
        throw new TypeError("CORS blocked");
      }
      return new Response("tile");
    });

    const response = await worker.request(image(noCors));
    expect(await response?.text()).toBe("tile");
    expect(worker.fetchCalls.map((call) => call.init?.mode)).toEqual(["cors", undefined]);

    await worker.request(image(noCorsNext));
    expect(worker.fetchCalls.at(-1)?.init).toBeUndefined();
  });

  it("answers with a network error when offline and the tile was never seen", async () => {
    worker.setOnline(false);

    const response = await worker.request(image(OSM_TILE));

    expect(response?.type).toBe("error");
    expect((await worker.cacheOf("fitpower-tiles-v1")).size).toBe(0);
  });

  it("keeps at most the tile limit and drops the oldest tiles first", async () => {
    const stats = (await worker.send({ type: "cache-stats" })) as { tileLimit: number };
    const limit = stats.tileLimit;
    expect(limit).toBeGreaterThan(100);
    const urls = Array.from({ length: limit + 3 }, (_v, i) => `https://t.example.org/8/${i}/7.png`);
    for (const url of urls) {
      worker.serve(url, "t");
      await worker.request(image(url));
    }

    const tiles = await worker.cacheOf("fitpower-tiles-v1");

    expect(tiles.size).toBe(limit);
    expect(urls.slice(0, 3).some((url) => tiles.has(url))).toBe(false);
    expect(tiles.has(urls[3]!)).toBe(true);
    expect(tiles.has(urls.at(-1)!)).toBe(true);
  });
});

describe("service worker: messages", () => {
  let worker: Worker;
  beforeEach(async () => {
    worker = createWorker();
    serveApp(worker);
    worker.serve(OSM_TILE, "osm-tile");
    worker.serve(OWN_TILE, "own-tile");
    await worker.lifecycle("install");
    await worker.request(image(OSM_TILE));
    await worker.request(image(OWN_TILE));
  });

  it("reports how many entries each cache holds", async () => {
    const reply = await worker.send({ type: "cache-stats" });

    expect(reply).toMatchObject({ type: "cache-stats", shell: 3, assets: 5, tiles: 2 });
    expect(reply).toHaveProperty("tileLimit");
  });

  it("clears only the saved map tiles and reports how many it removed", async () => {
    const reply = await worker.send({ type: "clear-tiles" });

    expect(reply).toEqual({ type: "clear-tiles", cleared: 2 });
    expect(await worker.storage.keys()).not.toContain("fitpower-tiles-v1");
    expect((await worker.cacheOf("fitpower-shell-v1")).size).toBe(3);
    expect((await worker.cacheOf("fitpower-assets-v1")).size).toBe(5);
  });

  it("keeps working after the tiles were cleared", async () => {
    await worker.send({ type: "clear-tiles" });

    await worker.request(image(OSM_TILE));

    expect(await worker.send({ type: "cache-stats" })).toMatchObject({ tiles: 1 });
  });

  it("fetches the app files again on request and reports the new counts", async () => {
    const fresh = createWorker();
    fresh.setOnline(false);
    await fresh.lifecycle("install");
    expect(await fresh.send({ type: "cache-stats" })).toMatchObject({ shell: 0, assets: 0 });

    serveApp(fresh);
    fresh.setOnline(true);
    const reply = await fresh.send({ type: "precache" });

    expect(reply).toMatchObject({ type: "cache-stats", shell: 3, assets: 5 });
  });

  it("reports an error instead of staying silent when a request cannot be answered", async () => {
    worker.storage.open = async () => {
      throw new Error("storage unavailable");
    };

    expect(await worker.send({ type: "cache-stats" })).toEqual({
      type: "cache-stats",
      error: true,
    });
  });

  it("ignores messages it does not know", async () => {
    expect(await worker.send({ type: "nonsense" })).toBeUndefined();
    expect(await worker.send("text")).toBeUndefined();
    expect(await worker.send(null)).toBeUndefined();
  });
});
