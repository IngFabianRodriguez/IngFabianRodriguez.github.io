import { createContext, useContext, type ReactNode } from "react";
import { getDefaultRideStore } from "@/lib/persistence/defaultStore";
import type { RideStore } from "@/lib/persistence/rideStore";

const RideStoreContext = createContext<RideStore | null>(null);

/** Gives the components below a specific store; without one they use the app's default. */
export function RideStoreProvider({ store, children }: { store: RideStore; children: ReactNode }) {
  return <RideStoreContext.Provider value={store}>{children}</RideStoreContext.Provider>;
}

export function useRideStore(): RideStore {
  return useContext(RideStoreContext) ?? getDefaultRideStore();
}
