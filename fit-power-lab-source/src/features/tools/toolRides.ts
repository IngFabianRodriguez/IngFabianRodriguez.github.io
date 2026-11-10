import { useCallback } from "react";
import { useAppActions } from "@/app/AppContext";
import type { RideSource } from "@/app/appState";
import { baseName } from "@/domain/exporters/fileName";
import { rideFromFit } from "@/domain/ride";
import { NoPositionError } from "@/domain/tools/correctElevation";
import { ElevationServiceError } from "@/domain/tools/elevationService";
import { MergeOverlapError } from "@/domain/tools/mergeFits";
import { EmptyTrimError } from "@/domain/tools/trimFit";
import type { FitFile } from "@/fit/readFit";

/** `ride.fit` and `trimmed` give `ride-trimmed.fit`. */
export const derivedName = (fileName: string, suffix: string) =>
  `${baseName(fileName)}-${suffix}.fit`;

/** Adds a ride made by a tool to the loaded rides (it becomes the active one). */
export function useAddDerivedRide() {
  const { addRide } = useAppActions();
  return useCallback(
    (fit: FitFile, fileName: string, source: RideSource = "fit") => {
      addRide({ fileName, source, fit, ride: rideFromFit(fit) });
    },
    [addRide],
  );
}

/** The translation key that tells the user why a tool stopped. */
export function toolErrorKey(error: unknown): string {
  if (error instanceof EmptyTrimError) return "tools.error.empty";
  if (error instanceof MergeOverlapError) return "tools.error.overlap";
  if (error instanceof NoPositionError) return "tools.error.noGps";
  if (error instanceof ElevationServiceError) return "tools.error.service";
  return "tools.error.unknown";
}
