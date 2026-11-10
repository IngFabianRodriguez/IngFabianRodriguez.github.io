import type { UserProfile } from "@/domain/device/userFit";

export type SensorStatus =
  "recorded" | "paired-no-data" | "not-paired" | "no-data" | "paired" | "unknown";

/**
 * Puts together what the device profile says (`paired`) and what the ride holds (`recorded`);
 * either can be unknown (undefined): no device folder chosen, or no ride loaded.
 */
export function sensorStatus(
  paired: boolean | undefined,
  recorded: boolean | undefined,
): SensorStatus {
  if (recorded === true) return "recorded";
  if (recorded === false) {
    if (paired === true) return "paired-no-data";
    return paired === false ? "not-paired" : "no-data";
  }
  if (paired === undefined) return "unknown";
  return paired ? "paired" : "not-paired";
}

/** Cadence comes from a cadence sensor or from a combined speed and cadence sensor. */
export function cadencePaired(sensors: UserProfile["sensors"]): boolean | undefined {
  if (sensors.cadence === true || sensors.speedCadence === true) return true;
  if (sensors.cadence === undefined && sensors.speedCadence === undefined) return undefined;
  return false;
}
