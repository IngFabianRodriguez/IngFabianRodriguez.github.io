import { createIndexedDbRideStore } from "@/lib/persistence/indexedDbStore";
import { createMemoryRideStore } from "@/lib/persistence/memoryStore";
import type { RideStore } from "@/lib/persistence/rideStore";

let instance: RideStore | null = null;

/**
 * The store the app uses: IndexedDB in a browser, memory where there is none (a test runner).
 * One instance for the whole page, so the hook, the restore and the library share it.
 */
export function getDefaultRideStore(): RideStore {
  instance ??=
    typeof indexedDB === "undefined" ? createMemoryRideStore() : createIndexedDbRideStore();
  return instance;
}

/** For tests that render the whole app: forget the shared store so the next test starts empty. */
export function resetDefaultRideStore(): void {
  instance = null;
}
