import { vi } from "vitest";

export interface FakeCacheState {
  shell: number;
  assets: number;
  tiles: number;
  tileLimit: number;
}

interface FakeOptions {
  /** What the worker's caches hold. */
  state?: Partial<FakeCacheState>;
  /** When false, `getRegistration()` finds nothing (the worker was never registered). */
  registered?: boolean;
  /** When true, the worker receives messages and never answers. */
  silent?: boolean;
}

/**
 * A stand-in for `navigator.serviceWorker` that answers the same messages as public/sw.js.
 * jsdom has no service worker support, so tests install this one and call `restore()` after.
 */
export function installFakeServiceWorker(options: FakeOptions = {}) {
  const state: FakeCacheState = {
    shell: 1,
    assets: 5,
    tiles: 7,
    tileLimit: 1500,
    ...options.state,
  };
  const received: unknown[] = [];

  const answer = (message: { type?: string }): unknown => {
    if (message.type === "cache-stats") return { type: "cache-stats", ...state };
    if (message.type === "precache") {
      state.shell = 1;
      state.assets = Math.max(state.assets, 5);
      return { type: "cache-stats", ...state };
    }
    if (message.type === "clear-tiles") {
      const cleared = state.tiles;
      state.tiles = 0;
      return { type: "clear-tiles", cleared };
    }
    return undefined;
  };

  const active = {
    postMessage: vi.fn((message: { type?: string }, transfer?: MessagePort[]) => {
      received.push(message);
      if (options.silent) return;
      const reply = answer(message);
      if (reply !== undefined) transfer?.[0]?.postMessage(reply);
    }),
  };
  const registration = { active, scope: "/" };
  const listeners = new Map<string, Set<() => void>>();
  const serviceWorker = {
    register: vi.fn(async () => registration),
    getRegistration: vi.fn(async () => (options.registered === false ? undefined : registration)),
    addEventListener: (type: string, listener: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener);
    },
  };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });

  return {
    state,
    received,
    register: serviceWorker.register,
    getRegistration: serviceWorker.getRegistration,
    /** Fires an event such as `controllerchange` at the listeners the code registered. */
    emit: (type: string) => listeners.get(type)?.forEach((listener) => listener()),
    restore: () => {
      Reflect.deleteProperty(navigator, "serviceWorker");
    },
  };
}
