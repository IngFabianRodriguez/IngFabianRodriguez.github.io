export type RegistrationResult = "registered" | "unsupported" | "disabled";

/** Entry counts of the caches that public/sw.js keeps. */
export interface CacheStats {
  shell: number;
  assets: number;
  tiles: number;
  tileLimit: number;
}

const REPLY_TIMEOUT_MS = 5000;

/**
 * Registers public/sw.js. It only runs on a production build: under `vite dev` a worker would
 * serve stale files and hide changes.
 */
export async function registerServiceWorker(): Promise<RegistrationResult> {
  if (!import.meta.env.PROD) return "disabled";
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  const base = import.meta.env.BASE_URL;
  try {
    // `updateViaCache: "none"` makes the browser check sw.js itself without the HTTP cache.
    await navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: "none" });
    return "registered";
  } catch {
    return "unsupported";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Sends one message to the active worker and waits for its answer, or null when there is none. */
async function askWorker(message: { type: string }): Promise<Record<string, unknown> | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const worker = (await navigator.serviceWorker.getRegistration())?.active;
  if (!worker) return null;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (value: Record<string, unknown> | null) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), REPLY_TIMEOUT_MS);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      finish(isRecord(data) && data["error"] !== true ? data : null);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

function toStats(reply: Record<string, unknown> | null): CacheStats | null {
  if (!reply) return null;
  const { shell, assets, tiles, tileLimit } = reply;
  if (
    typeof shell !== "number" ||
    typeof assets !== "number" ||
    typeof tiles !== "number" ||
    typeof tileLimit !== "number"
  ) {
    return null;
  }
  return { shell, assets, tiles, tileLimit };
}

/** How many entries the worker holds, or null when there is no worker to ask. */
export async function getCacheStats(): Promise<CacheStats | null> {
  return toStats(await askWorker({ type: "cache-stats" }));
}

/** Drops the saved map tiles. Returns how many were removed, or null without a worker. */
export async function clearTileCache(): Promise<number | null> {
  const reply = await askWorker({ type: "clear-tiles" });
  return reply && typeof reply["cleared"] === "number" ? reply["cleared"] : null;
}

/** Asks the worker to fetch the page and its files again, for a first install that failed. */
export async function precacheApp(): Promise<CacheStats | null> {
  return toStats(await askWorker({ type: "precache" }));
}
