/**
 * Everything the user can tune in the power model. These are the field names every part of the
 * app agrees on; `estimatePower` reads them through `PowerParams`.
 */
export interface ModelSettings {
  /** Rolling resistance coefficient. */
  crr: number;
  /** Drag area (drag coefficient times frontal area), in m2. */
  cdA: number;
  /** Share of the pedal power that reaches the rear wheel (0 to 1). */
  drivetrainEfficiency: number;
  /** Wind speed in m/s; 0 means still air. */
  windSpeedMs: number;
  /** Direction the wind comes FROM, in degrees (0 = north, 90 = east). */
  windFromDeg: number;
  /** Multiplier on drag when riding in a group: 1 = alone, 0.7 = 30% less drag. */
  draftingFactor: number;
  /** Width in seconds of a centered moving average applied to speed; 0 = none. */
  speedSmoothingS: number;
  /** When true, hard decelerations are treated as braking instead of coasting. */
  brakingDetection: boolean;
  /** Degrees subtracted from the device temperature before computing air density. */
  temperatureOffsetC: number;
  /** Multiplier applied to the final watts; 1 = none. Learned by calibration. */
  calibrationFactor: number;
}

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  crr: 0.006,
  cdA: 0.4,
  drivetrainEfficiency: 0.975,
  windSpeedMs: 0,
  windFromDeg: 0,
  draftingFactor: 1,
  speedSmoothingS: 0,
  brakingDetection: false,
  temperatureOffsetC: 0,
  calibrationFactor: 1,
};
