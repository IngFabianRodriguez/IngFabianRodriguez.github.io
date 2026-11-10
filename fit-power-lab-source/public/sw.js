/* global self, caches, fetch, URL, Response */
// Offline support for FIT power lab. Plain JavaScript on purpose: it is served as-is from the
// site root and has no build step.
//
// - Page (navigation): network first, saved copy when the network fails.
// - The icon and the manifest: network first, saved copy when the network fails.
// - Hashed files under /assets/: cache first. The first install also fetches every file the page
//   references so the app opens offline after a single visit.
// - Map tiles: kept only when the page asks for an image whose path ends with /{z}/{x}/{y}.
//   The tile server is chosen by the user at run time, so the host cannot be listed here.
// - Everything else (APIs, other sites, writes) is left to the browser.

const CACHE_PREFIX = "fitpower-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-v1`;
const TILE_CACHE = `${CACHE_PREFIX}tiles-v1`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, TILE_CACHE];

const TILE_LIMIT = 1500;
const PRECACHE_FILE_LIMIT = 150;
const PRECACHE_PARALLEL = 8;
const TILE_PATH = /\/\d{1,2}\/\d+\/\d+(?:@\dx)?(?:\.(?:png|jpe?g|webp|avif))?$/;

const SCOPE = self.registration.scope;
const ORIGIN = new URL(SCOPE).origin;
const ASSET_PREFIX = new URL("assets/", SCOPE).href;
// Files the page needs that no hashed reference points to: kept and served the way the page is.
const SHELL_FILES = ["icon.svg", "manifest.webmanifest"].map((name) => new URL(name, SCOPE).href);

// Tile hosts that did not answer a CORS request, so they are asked the plain way from then on.
const corsBlocked = new Set();

async function store(cache, key, response) {
  try {
    await cache.put(key, response);
  } catch {
    // A full disk must not break the page that is being served.
  }
}

/** Addresses of the hashed files that a page, script or stylesheet refers to. */
function referencedAssets(text, fileUrl) {
  const found = new Set();
  for (const match of text.matchAll(/assets\/[\w.-]+\.[a-z0-9]+/gi)) {
    found.add(new URL(match[0], SCOPE).href);
  }
  for (const match of text.matchAll(/\.\/([\w.-]+\.(?:js|css|woff2?))/gi)) {
    found.add(new URL(match[1], fileUrl).href);
  }
  return [...found].filter((url) => url.startsWith(ASSET_PREFIX));
}

/** Saves the page and, following the references in it, every file the app can load. */
async function precache() {
  const page = await fetch(SCOPE, { cache: "reload" });
  if (!page.ok) return;
  const shell = await caches.open(SHELL_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  await store(shell, SCOPE, page.clone());
  // The icon and the manifest are not in the page's asset list, but the page needs them offline.
  for (const url of SHELL_FILES) {
    try {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) await store(shell, url, response);
    } catch {
      // A missing icon must not stop the rest.
    }
  }

  const queue = referencedAssets(await page.text(), SCOPE);
  const seen = new Set();
  async function load(url) {
    try {
      const response = await fetch(url, { cache: "reload" });
      if (!response.ok) return;
      await store(assets, url, response.clone());
      if (/\.(?:js|css)$/.test(url)) {
        queue.push(...referencedAssets(await response.text(), url));
      }
    } catch {
      // One missing file must not stop the rest.
    }
  }
  while (queue.length > 0 && seen.size < PRECACHE_FILE_LIMIT) {
    const wave = [];
    while (queue.length > 0 && wave.length < PRECACHE_PARALLEL && seen.size < PRECACHE_FILE_LIMIT) {
      const url = queue.shift();
      if (!seen.has(url)) {
        seen.add(url);
        wave.push(load(url));
      }
    }
    await Promise.all(wave);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) {
      await store(await caches.open(SHELL_CACHE), SCOPE, response.clone());
    }
    return response;
  } catch (error) {
    const saved = await (await caches.open(SHELL_CACHE)).match(SCOPE);
    if (saved) return saved;
    throw error;
  }
}

/** The icon and the manifest: network first so they stay current, the saved copy when offline. */
async function shellFile(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await store(cache, request.url, response.clone());
    return response;
  } catch (error) {
    const saved = await cache.match(request.url);
    if (saved) return saved;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const saved = await cache.match(request.url);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) await store(cache, request.url, response.clone());
  return response;
}

/** Oldest tiles go first: the cache lists its entries in the order they were added. */
async function trimTiles(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - TILE_LIMIT; i += 1) {
    await cache.delete(keys[i]);
  }
}

async function tile(request) {
  const cache = await caches.open(TILE_CACHE);
  const saved = await cache.match(request.url);
  if (saved) return saved;

  // A CORS answer can be read and kept; the plain image request gives an opaque one that the
  // browser counts as several megabytes of storage each.
  const origin = new URL(request.url).origin;
  let corsFailed = false;
  if (!corsBlocked.has(origin)) {
    try {
      const response = await fetch(request.url, { mode: "cors", credentials: "omit" });
      if (response.ok) {
        await store(cache, request.url, response.clone());
        await trimTiles(cache);
      }
      return response;
    } catch {
      corsFailed = true;
    }
  }
  try {
    const response = await fetch(request);
    // The plain request worked, so the first failure was the missing CORS header, not the network.
    if (corsFailed) corsBlocked.add(origin);
    if (response.ok) {
      await store(cache, request.url, response.clone());
      await trimTiles(cache);
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function count(name) {
  return (await (await caches.open(name)).keys()).length;
}

async function stats() {
  return {
    type: "cache-stats",
    shell: await count(SHELL_CACHE),
    assets: await count(ASSET_CACHE),
    tiles: await count(TILE_CACHE),
    tileLimit: TILE_LIMIT,
  };
}

async function clearTiles() {
  const cleared = await count(TILE_CACHE);
  await caches.delete(TILE_CACHE);
  return { type: "clear-tiles", cleared };
}

self.addEventListener("install", (event) => {
  // The routing below does not depend on the app version (the page is network first and the
  // files are hashed), so a new worker can take over at once instead of stranding open tabs.
  self.skipWaiting();
  event.waitUntil(precache().catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === ORIGIN) {
    event.respondWith(networkFirst(request));
  } else if (SHELL_FILES.includes(url.href)) {
    event.respondWith(shellFile(request));
  } else if (url.href.startsWith(ASSET_PREFIX)) {
    event.respondWith(cacheFirst(request));
  } else if (request.destination === "image" && TILE_PATH.test(url.pathname)) {
    event.respondWith(tile(request));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data.type !== "string") return;
  const jobs = new Map([
    ["cache-stats", stats],
    ["clear-tiles", clearTiles],
    [
      "precache",
      async () => {
        await precache();
        return stats();
      },
    ],
  ]);
  const job = jobs.get(data.type);
  if (!job) return;
  const port = event.ports && event.ports[0];
  const reply = (body) => {
    if (port) port.postMessage(body);
  };
  const failed = () =>
    reply({ type: data.type === "precache" ? "cache-stats" : data.type, error: true });
  event.waitUntil(job().then(reply, failed));
});
