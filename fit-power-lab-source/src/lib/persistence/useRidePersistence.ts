import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/app/AppContext";
import type { LoadedRide } from "@/app/appState";
import { summarizeLoaded } from "@/domain/import/activitySummary";
import { activityKey, fileKey } from "@/domain/import/duplicates";
import type { RideStore } from "@/lib/persistence/rideStore";
import { useRideStore } from "@/lib/persistence/RideStoreContext";
import { encodeFit, sourceOf } from "@/lib/persistence/sources";

async function save(store: RideStore, loaded: LoadedRide): Promise<void> {
  const known = sourceOf(loaded.fit);
  if (known?.persisted) return;

  const bytes = known?.bytes ?? encodeFit(loaded.fit);
  const summary = summarizeLoaded(loaded.fit, loaded.ride);
  const now = Date.now();
  await store.saveRide({
    id: loaded.id,
    fileName: loaded.fileName,
    source: loaded.source,
    bytes,
    savedAt: loaded.loadedAt,
  });
  await store.rememberRecent({
    key: fileKey(loaded.fileName, bytes.length),
    fileName: loaded.fileName,
    sizeBytes: bytes.length,
    startTime: summary.startTime.getTime(),
    distanceM: summary.distanceM,
    durationS: summary.durationS,
    openedAt: now,
  });
  await store.markProcessed([
    {
      key: activityKey(summary),
      fileName: loaded.fileName,
      sizeBytes: bytes.length,
      processedAt: now,
    },
  ]);
}

/**
 * Keeps the store in step with the loaded rides: a ride that appears is saved (its original
 * bytes and name; the store keeps the latest few), one that disappears is forgotten. The
 * bundled sample ride is not saved, and neither is a ride that was just restored from the store.
 * Writes run one after the other in the order the rides changed. `failed` says the last write
 * did not work (storage full or blocked); the app itself is not affected.
 */
export function useRidePersistence(store?: RideStore): { failed: boolean } {
  const fromContext = useRideStore();
  const target = store ?? fromContext;
  const { rides } = useAppState();
  const known = useRef(new Set<string>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const present = new Set(rides.map((ride) => ride.id));
    const gone = [...known.current].filter((id) => !present.has(id));
    const added = rides.filter((ride) => !known.current.has(ride.id));
    if (gone.length === 0 && added.length === 0) return;

    for (const id of gone) known.current.delete(id);
    for (const ride of added) known.current.add(ride.id);

    queue.current = queue.current.then(async () => {
      try {
        for (const id of gone) await target.removeRide(id);
        for (const ride of added) {
          if (ride.source !== "sample") await save(target, ride);
        }
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  }, [rides, target]);

  return { failed };
}
