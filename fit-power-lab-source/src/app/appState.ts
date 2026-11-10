import type { Locale } from "@/app/i18n";
import { DEFAULT_MODEL_SETTINGS, type ModelSettings } from "@/domain/modelSettings";
import type { Ride } from "@/domain/ride";
import type { SeriesKey } from "@/domain/series";
import type { Weights } from "@/domain/weights";
import type { FitFile } from "@/fit/readFit";
import type { UnitSystem } from "@/lib/units";

export type Theme = "light" | "dark" | "system";
export type XAxis = "distance" | "time";
/**
 * How the map gets its background. Tile requests reveal the area being looked at, so the user can
 * use OpenStreetMap, a tile server of their own, or no background at all, and can hide the start
 * and the end of the route (where people live) from the drawing.
 */
export interface MapPrivacy {
  mode: "osm" | "custom" | "none";
  /** Tile URL template with {z}, {x} and {y}; used when `mode` is "custom". */
  customUrl: string;
  /** Meters at each end of the route that are not drawn; 0 draws the whole route. */
  hideEndsM: number;
}

export const DEFAULT_MAP_PRIVACY: MapPrivacy = { mode: "osm", customUrl: "", hideEndsM: 0 };

export type RideSource = "fit" | "gpx" | "tcx" | "merged" | "sample";

/** A stretch of the ride selected on the charts, in km. */
export interface KmRange {
  fromKm: number;
  toKm: number;
}

/**
 * A ride the user loaded. `fit` is always present: rides imported from other formats get a
 * synthesized FIT so that export works the same for every source.
 */
export interface LoadedRide {
  id: string;
  fileName: string;
  source: RideSource;
  fit: FitFile;
  ride: Ride;
  loadedAt: number;
}

export interface AppState {
  weights: Weights | null;
  model: ModelSettings;
  units: UnitSystem;
  locale: Locale;
  theme: Theme;
  rides: LoadedRide[];
  activeId: string | null;
  /** A second ride shown next to the active one, when comparing. */
  compareId: string | null;
  /** Distance in km under the pointer on any chart; shared so every chart and the map follow it. */
  cursorKm: number | null;
  /** Stretch selected on a chart; summaries and metrics are computed for it when set. */
  range: KmRange | null;
  /** Variable the route on the map is colored by. */
  mapVariable: SeriesKey;
  xAxis: XAxis;
  mapPrivacy: MapPrivacy;
}

export type AppAction =
  | { type: "setWeights"; weights: Weights | null }
  | { type: "setModel"; patch: Partial<ModelSettings> }
  | { type: "resetModel" }
  | { type: "setUnits"; units: UnitSystem }
  | { type: "setLocale"; locale: Locale }
  | { type: "setTheme"; theme: Theme }
  | { type: "addRide"; ride: LoadedRide }
  | { type: "removeRide"; id: string }
  | { type: "selectRide"; id: string | null }
  | { type: "setCompare"; id: string | null }
  | { type: "setCursorKm"; km: number | null }
  | { type: "setRange"; range: KmRange | null }
  | { type: "setMapVariable"; variable: SeriesKey }
  | { type: "setXAxis"; axis: XAxis }
  | { type: "setMapPrivacy"; patch: Partial<MapPrivacy> };

export function initialAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    weights: null,
    model: DEFAULT_MODEL_SETTINGS,
    units: "metric",
    locale: "en",
    theme: "system",
    rides: [],
    activeId: null,
    compareId: null,
    cursorKm: null,
    range: null,
    mapVariable: "power",
    xAxis: "distance",
    mapPrivacy: DEFAULT_MAP_PRIVACY,
    ...overrides,
  };
}

/** Switching to another ride invalidates what was selected on the previous one. */
const withActive = (state: AppState, activeId: string | null): AppState =>
  activeId === state.activeId ? state : { ...state, activeId, cursorKm: null, range: null };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "setWeights":
      return { ...state, weights: action.weights };
    case "setModel":
      return { ...state, model: { ...state.model, ...action.patch } };
    case "resetModel":
      return { ...state, model: DEFAULT_MODEL_SETTINGS };
    case "setUnits":
      return { ...state, units: action.units };
    case "setLocale":
      return { ...state, locale: action.locale };
    case "setTheme":
      return { ...state, theme: action.theme };
    case "addRide": {
      // A ride that comes back with an id already in the list replaces it instead of repeating it.
      const exists = state.rides.some((r) => r.id === action.ride.id);
      const rides = exists
        ? state.rides.map((r) => (r.id === action.ride.id ? action.ride : r))
        : [...state.rides, action.ride];
      return withActive({ ...state, rides }, action.ride.id);
    }
    case "removeRide": {
      const rides = state.rides.filter((r) => r.id !== action.id);
      const next = {
        ...state,
        rides,
        compareId: state.compareId === action.id ? null : state.compareId,
      };
      return state.activeId === action.id ? withActive(next, rides.at(-1)?.id ?? null) : next;
    }
    case "selectRide":
      return action.id === null || state.rides.some((r) => r.id === action.id)
        ? withActive(state, action.id)
        : state;
    case "setCompare":
      return action.id === null || state.rides.some((r) => r.id === action.id)
        ? { ...state, compareId: action.id }
        : state;
    case "setCursorKm":
      return { ...state, cursorKm: action.km };
    case "setRange":
      return { ...state, range: action.range };
    case "setMapVariable":
      return { ...state, mapVariable: action.variable };
    case "setXAxis":
      return { ...state, xAxis: action.axis };
    case "setMapPrivacy":
      return { ...state, mapPrivacy: { ...state.mapPrivacy, ...action.patch } };
  }
}
