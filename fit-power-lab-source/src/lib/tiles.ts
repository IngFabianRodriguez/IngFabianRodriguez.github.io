import type { MapPrivacy, TerrainPrivacy } from "@/app/appState";

export interface TileConfig {
  /** Tile URL template with {z}, {x} and {y}, or null when the map has no background. */
  url: string | null;
  /** HTML shown in the corner of the map; empty when there is nothing to credit. */
  attribution: string;
  maxZoom: number;
}

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** A usable tile template is a web address with the three placeholders; anything else is refused. */
function isTemplate(url: string): boolean {
  return /^https?:\/\//i.test(url) && ["{z}", "{x}", "{y}"].every((part) => url.includes(part));
}

/** Where the map gets its background from, according to the user's privacy choice. */
export function tileConfig(privacy: MapPrivacy): TileConfig {
  if (privacy.mode === "osm") return { url: OSM_URL, attribution: OSM_ATTRIBUTION, maxZoom: 19 };
  if (privacy.mode === "custom" && isTemplate(privacy.customUrl)) {
    return { url: privacy.customUrl, attribution: "", maxZoom: 19 };
  }
  return { url: null, attribution: "", maxZoom: 19 };
}

const TERRAIN_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const TERRAIN_ATTRIBUTION = "Terrain: Mapzen, AWS Open Data";

/** Elevation tiles in the Terrarium encoding, and the most detailed zoom the public ones have. */
export interface TerrainConfig {
  /** Tile URL template with {z}, {x} and {y}, or null when the video has no relief. */
  url: string | null;
  /** Plain text to credit the terrain data; empty when there is nothing to credit. */
  attribution: string;
  maxZoom: number;
}

/** Where the relief of the 3D video comes from, according to the user's privacy choice. */
export function terrainConfig(privacy: TerrainPrivacy): TerrainConfig {
  if (privacy.mode === "public") {
    return { url: TERRAIN_URL, attribution: TERRAIN_ATTRIBUTION, maxZoom: 15 };
  }
  if (privacy.mode === "custom" && isTemplate(privacy.customUrl)) {
    return { url: privacy.customUrl, attribution: "", maxZoom: 15 };
  }
  return { url: null, attribution: "", maxZoom: 15 };
}
