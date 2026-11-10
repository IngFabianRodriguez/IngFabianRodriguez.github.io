/**
 * Ready-made values for the power model. They are rounded, typical figures from the cycling-power
 * literature (wind-tunnel and coast-down studies of riders on road bikes, and tire rolling
 * resistance tests), not measurements of any one rider: use them as a starting point and refine
 * them with a calibration or a coast-down estimate.
 */
export interface Preset<Id extends string = string> {
  id: Id;
  value: number;
}

export type PosturePresetId = "urban" | "handsUp" | "lowGrip";
export type SurfacePresetId = "asphalt" | "gravel" | "dirt";
export type DraftingPresetId = "alone" | "pair" | "smallGroup" | "peloton";
export type WindPresetId = "calm" | "light" | "moderate" | "fresh";

/**
 * Drag area CdA in m2. Upright commuting is about 0.5-0.6, hands on the tops or hoods about
 * 0.35-0.45 and the drops about 0.30-0.35.
 */
export const POSTURE_PRESETS: Preset<PosturePresetId>[] = [
  { id: "urban", value: 0.55 },
  { id: "handsUp", value: 0.4 },
  { id: "lowGrip", value: 0.32 },
];

/**
 * Rolling resistance coefficient Crr. Road tires on smooth asphalt are 0.004-0.008, gravel tires on
 * hard-packed gravel 0.008-0.012 and a dirt road 0.012-0.020.
 */
export const SURFACE_PRESETS: Preset<SurfacePresetId>[] = [
  { id: "asphalt", value: 0.006 },
  { id: "gravel", value: 0.01 },
  { id: "dirt", value: 0.015 },
];

/**
 * Share of the drag left when riding in a group. Studies of drafting find about a quarter less
 * drag behind one rider and up to half less inside a tight bunch.
 */
export const DRAFTING_PRESETS: Preset<DraftingPresetId>[] = [
  { id: "alone", value: 1 },
  { id: "pair", value: 0.75 },
  { id: "smallGroup", value: 0.65 },
  { id: "peloton", value: 0.5 },
];

/** Wind speed in m/s for the descriptive wind choices (about Beaufort 0, 2, 3-4 and 5). */
export const WIND_PRESETS: Preset<WindPresetId>[] = [
  { id: "calm", value: 0 },
  { id: "light", value: 2.5 },
  { id: "moderate", value: 5 },
  { id: "fresh", value: 8 },
];

/** The id of the preset that holds `value` (within float noise), or "custom". */
export function matchPreset<Id extends string>(
  presets: Preset<Id>[],
  value: number,
): Id | "custom" {
  return presets.find((p) => Math.abs(p.value - value) < 1e-9)?.id ?? "custom";
}
