import { useMemo } from "react";
import { useActiveRide, useAppState } from "@/app/AppContext";
import type { ModelSettings } from "@/domain/modelSettings";
import type { PowerParams } from "@/domain/power";
import type { Ride } from "@/domain/ride";
import type { UnitSystem } from "@/lib/units";

export interface ModelInputs {
  model: ModelSettings;
  units: UnitSystem;
  /** The active ride, or null when none is loaded. */
  ride: Ride | null;
  /** Model and confirmed weights together; null until the weights are confirmed. */
  params: PowerParams | null;
}

/** What every card of the model section reads from the app state. */
export function useModelInputs(): ModelInputs {
  const { model, units, weights } = useAppState();
  const active = useActiveRide();
  const params = useMemo<PowerParams | null>(
    () => (weights ? { ...model, riderMassKg: weights.riderKg, bikeMassKg: weights.bikeKg } : null),
    [model, weights],
  );
  return { model, units, ride: active?.ride ?? null, params };
}
