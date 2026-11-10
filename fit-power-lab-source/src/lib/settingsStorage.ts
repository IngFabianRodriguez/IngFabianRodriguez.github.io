import {
  DEFAULT_MAP_PRIVACY,
  DEFAULT_TERRAIN_PRIVACY,
  type MapPrivacy,
  type TerrainPrivacy,
  type Theme,
} from "@/app/appState";
import { LOCALES, type Locale } from "@/app/i18n";
import { DEFAULT_MODEL_SETTINGS, type ModelSettings } from "@/domain/modelSettings";
import type { UnitSystem } from "@/lib/units";

const KEY = "fit-power-web.settings";

export interface StoredSettings {
  units: UnitSystem;
  locale: Locale;
  theme: Theme;
  model: ModelSettings;
  mapPrivacy: MapPrivacy;
  /** Missing in settings saved before the 3D video existed. */
  terrainPrivacy?: TerrainPrivacy;
}

const UNITS: UnitSystem[] = ["metric", "imperial"];
const THEMES: Theme[] = ["light", "dark", "system"];

function readModel(raw: unknown): ModelSettings | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const source = raw as Record<string, unknown>;
  const defaults = DEFAULT_MODEL_SETTINGS as unknown as Record<string, number | boolean>;
  const model: Record<string, number | boolean> = { ...defaults };
  let found = false;

  for (const [name, fallback] of Object.entries(defaults)) {
    const value = source[name];
    if (typeof fallback === "number" && typeof value === "number" && Number.isFinite(value)) {
      model[name] = value;
      found = true;
    } else if (typeof fallback === "boolean" && typeof value === "boolean") {
      model[name] = value;
      found = true;
    }
  }
  return found ? (model as unknown as ModelSettings) : undefined;
}

const MAP_MODES: MapPrivacy["mode"][] = ["osm", "custom", "none"];

function readMapPrivacy(raw: unknown): MapPrivacy | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const source = raw as Record<string, unknown>;
  const mode = MAP_MODES.includes(source["mode"] as MapPrivacy["mode"])
    ? (source["mode"] as MapPrivacy["mode"])
    : undefined;
  const customUrl = typeof source["customUrl"] === "string" ? source["customUrl"] : undefined;
  const hide = source["hideEndsM"];
  const hideEndsM =
    typeof hide === "number" && Number.isFinite(hide) && hide >= 0 ? hide : undefined;
  if (mode === undefined && customUrl === undefined && hideEndsM === undefined) return undefined;
  return {
    mode: mode ?? DEFAULT_MAP_PRIVACY.mode,
    customUrl: customUrl ?? DEFAULT_MAP_PRIVACY.customUrl,
    hideEndsM: hideEndsM ?? DEFAULT_MAP_PRIVACY.hideEndsM,
  };
}

const TERRAIN_MODES: TerrainPrivacy["mode"][] = ["public", "custom", "none"];

function readTerrainPrivacy(raw: unknown): TerrainPrivacy | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const source = raw as Record<string, unknown>;
  const mode = TERRAIN_MODES.includes(source["mode"] as TerrainPrivacy["mode"])
    ? (source["mode"] as TerrainPrivacy["mode"])
    : undefined;
  const customUrl = typeof source["customUrl"] === "string" ? source["customUrl"] : undefined;
  if (mode === undefined && customUrl === undefined) return undefined;
  return {
    mode: mode ?? DEFAULT_TERRAIN_PRIVACY.mode,
    customUrl: customUrl ?? DEFAULT_TERRAIN_PRIVACY.customUrl,
  };
}

/** Saved preferences; any field that is missing or not valid is left out. */
export function loadSettings(): Partial<StoredSettings> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return {};
    const source = data as Record<string, unknown>;

    const settings: Partial<StoredSettings> = {};
    if (UNITS.includes(source["units"] as UnitSystem))
      settings.units = source["units"] as UnitSystem;
    if (LOCALES.includes(source["locale"] as Locale)) settings.locale = source["locale"] as Locale;
    if (THEMES.includes(source["theme"] as Theme)) settings.theme = source["theme"] as Theme;
    const model = readModel(source["model"]);
    if (model) settings.model = model;
    const mapPrivacy = readMapPrivacy(source["mapPrivacy"]);
    if (mapPrivacy) settings.mapPrivacy = mapPrivacy;
    const terrainPrivacy = readTerrainPrivacy(source["terrainPrivacy"]);
    if (terrainPrivacy) settings.terrainPrivacy = terrainPrivacy;
    return settings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, quota); preferences are then just not remembered.
  }
}
