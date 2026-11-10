import { useEffect, useState } from "react";
import type { ProcessedActivity, RecentFile, StoredRide } from "@/lib/persistence/rideStore";
import { useRideStore } from "@/lib/persistence/RideStoreContext";

export interface StoreSnapshot {
  recent: RecentFile[];
  stored: StoredRide[];
  processed: ProcessedActivity[];
}

const EMPTY: StoreSnapshot = { recent: [], stored: [], processed: [] };

/** What the ride store holds, read again whenever something changes it. */
export function useStoreSnapshot(): StoreSnapshot {
  const store = useRideStore();
  const [snapshot, setSnapshot] = useState(EMPTY);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [recent, stored, processed] = await Promise.all([
          store.listRecent(),
          store.loadRides(),
          store.listProcessed(),
        ]);
        if (alive) setSnapshot({ recent, stored, processed });
      } catch {
        // Without storage the panel simply shows what this session has.
      }
    };
    void refresh();
    const stop = store.subscribe(() => void refresh());
    return () => {
      alive = false;
      stop();
    };
  }, [store]);

  return snapshot;
}
