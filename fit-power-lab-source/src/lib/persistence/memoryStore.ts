import {
  MAX_PROCESSED,
  MAX_RECENT_FILES,
  MAX_STORED_RIDES,
  type ProcessedActivity,
  type RecentFile,
  type RideStore,
  type StoredRide,
} from "@/lib/persistence/rideStore";

interface Slot {
  seq: number;
  ride: StoredRide;
}

const copyRide = (ride: StoredRide): StoredRide => ({ ...ride, bytes: ride.bytes.slice() });

/** A store that lives in memory: for tests, and for browsers that have no IndexedDB. */
export function createMemoryRideStore(): RideStore {
  const rides = new Map<string, Slot>();
  const recent = new Map<string, RecentFile>();
  const processed = new Map<string, ProcessedActivity>();
  const listeners = new Set<() => void>();
  let seq = 0;

  const changed = () => listeners.forEach((listener) => listener());

  return {
    async saveRide(ride) {
      const existing = rides.get(ride.id);
      rides.set(ride.id, { seq: existing?.seq ?? ++seq, ride: copyRide(ride) });
      const oldestFirst = [...rides.values()].sort((a, b) => a.seq - b.seq);
      for (const slot of oldestFirst.slice(0, Math.max(0, oldestFirst.length - MAX_STORED_RIDES))) {
        rides.delete(slot.ride.id);
      }
      changed();
    },

    async removeRide(id) {
      rides.delete(id);
      changed();
    },

    async loadRides() {
      return [...rides.values()].sort((a, b) => a.seq - b.seq).map((slot) => copyRide(slot.ride));
    },

    async rememberRecent(file) {
      recent.set(file.key, { ...file });
      const newestFirst = [...recent.values()].sort((a, b) => b.openedAt - a.openedAt);
      for (const old of newestFirst.slice(MAX_RECENT_FILES)) recent.delete(old.key);
      changed();
    },

    async forgetRecent(key) {
      recent.delete(key);
      changed();
    },

    async listRecent() {
      return [...recent.values()].sort((a, b) => b.openedAt - a.openedAt).map((r) => ({ ...r }));
    },

    async markProcessed(items) {
      for (const item of items) processed.set(item.key, { ...item });
      const newestFirst = [...processed.values()].sort((a, b) => b.processedAt - a.processedAt);
      for (const old of newestFirst.slice(MAX_PROCESSED)) processed.delete(old.key);
      changed();
    },

    async listProcessed() {
      return [...processed.values()].map((p) => ({ ...p }));
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
