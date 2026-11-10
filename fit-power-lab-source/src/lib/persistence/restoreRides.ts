import type { NewRide } from "@/app/AppContext";
import { decodeRideFile } from "@/domain/import/decode";
import type { RideStore } from "@/lib/persistence/rideStore";
import { rememberSource } from "@/lib/persistence/sources";

/**
 * The rides saved by earlier visits, read again through `decodeRideFile` (the path every file
 * takes), oldest first so the latest ends up active. Corrupted ones are skipped, and a store
 * that cannot be read gives an empty list: starting the app never depends on it. Each ride keeps
 * its stored id and is marked as already stored, so adding it does not save it a second time.
 */
export async function restoreRides(store: RideStore): Promise<NewRide[]> {
  let stored;
  try {
    stored = await store.loadRides();
  } catch {
    return [];
  }

  const rides: NewRide[] = [];
  for (const item of stored) {
    try {
      const decoded = decodeRideFile(item.fileName, item.bytes);
      rememberSource(decoded.fit, item.bytes, { persisted: true });
      rides.push({
        id: item.id,
        fileName: item.fileName,
        source: item.source,
        fit: decoded.fit,
        ride: decoded.ride,
      });
    } catch {
      // A ride that no longer decodes is left out; the rest still come back.
    }
  }
  return rides;
}
