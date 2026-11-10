export type UnitSystem = "metric" | "imperial";

const KM_PER_MILE = 1.609344;
const METERS_PER_FOOT = 0.3048;
const KG_PER_POUND = 0.45359237;

const imperial = (units: UnitSystem) => units === "imperial";

export const distanceUnit = (u: UnitSystem) => (imperial(u) ? "mi" : "km");
export const speedUnit = (u: UnitSystem) => (imperial(u) ? "mph" : "km/h");
export const altitudeUnit = (u: UnitSystem) => (imperial(u) ? "ft" : "m");
export const temperatureUnit = (u: UnitSystem) => (imperial(u) ? "°F" : "°C");
export const weightUnit = (u: UnitSystem) => (imperial(u) ? "lb" : "kg");

export const distanceValue = (km: number, u: UnitSystem) => (imperial(u) ? km / KM_PER_MILE : km);
export const speedValue = (kmh: number, u: UnitSystem) => (imperial(u) ? kmh / KM_PER_MILE : kmh);
export const altitudeValue = (m: number, u: UnitSystem) => (imperial(u) ? m / METERS_PER_FOOT : m);
export const temperatureValue = (c: number, u: UnitSystem) => (imperial(u) ? (c * 9) / 5 + 32 : c);
export const weightValue = (kg: number, u: UnitSystem) => (imperial(u) ? kg / KG_PER_POUND : kg);

/** A weight typed by the user in the chosen system, in kilograms. */
export const weightToKg = (value: number, u: UnitSystem) =>
  imperial(u) ? value * KG_PER_POUND : value;

/** Rounds to `digits` decimals and drops a useless trailing zero ("70.0" becomes "70"). */
const trim = (value: number, digits: number) => Number(value.toFixed(digits)).toString();

export const formatDistance = (km: number, u: UnitSystem, digits = 1) =>
  `${trim(distanceValue(km, u), digits)} ${distanceUnit(u)}`;
export const formatSpeed = (kmh: number, u: UnitSystem, digits = 1) =>
  `${trim(speedValue(kmh, u), digits)} ${speedUnit(u)}`;
export const formatAltitude = (m: number, u: UnitSystem, digits = 0) =>
  `${trim(altitudeValue(m, u), digits)} ${altitudeUnit(u)}`;
export const formatTemperature = (c: number, u: UnitSystem, digits = 0) =>
  `${trim(temperatureValue(c, u), digits)} ${temperatureUnit(u)}`;
export const formatWeight = (kg: number, u: UnitSystem, digits = 1) =>
  `${trim(weightValue(kg, u), digits)} ${weightUnit(u)}`;

/** `h:mm:ss`, or `m:ss` when under an hour. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
