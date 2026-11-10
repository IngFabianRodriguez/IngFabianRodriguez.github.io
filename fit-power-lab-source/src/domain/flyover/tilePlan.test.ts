import { describe, expect, it } from "vitest";
import type { LatLon } from "@/domain/route";
import {
  keyOf,
  PATCH_TILES,
  patchOrigin,
  patchTiles,
  planImagery,
  planTerrain,
} from "@/domain/flyover/tilePlan";
import { groundMetersPerTile, tileCoords } from "@/domain/viz/mercator";

/** A straight route heading north from a point in a mid latitude, one position every 100 m. */
function route(lengthKm: number, lat = 45, lon = 7): LatLon[] {
  const steps = Math.round(lengthKm * 10);
  return Array.from({ length: steps + 1 }, (_, i): LatLon => [lat + (i * 100) / 111_320, lon]);
}

describe("groundMetersPerTile", () => {
  it("is the circumference of the earth over the number of tiles, shrunk by the latitude", () => {
    expect(groundMetersPerTile(0, 0)).toBeCloseTo(40_075_016.7, 0);
    expect(groundMetersPerTile(0, 10)).toBeCloseTo(40_075_016.7 / 1024, 1);
    expect(groundMetersPerTile(60, 5)).toBeCloseTo(groundMetersPerTile(0, 5) / 2, 1);
  });
});

describe("patchOrigin and patchTiles", () => {
  it("is a block of tiles that has the tile of the position a little off its center", () => {
    const [tx, ty] = tileCoords(45, 7, 14);
    const origin = patchOrigin(45, 7, 14);

    expect(PATCH_TILES).toBe(6);
    expect(origin).toEqual({ x: Math.floor(tx) - 2, y: Math.floor(ty) - 2 });
    const tiles = patchTiles(origin, 14);
    expect(tiles).toHaveLength(36);
    expect(tiles).toContainEqual({ z: 14, x: Math.floor(tx), y: Math.floor(ty) });
    expect(tiles).toContainEqual({ z: 14, x: Math.floor(tx) + 3, y: Math.floor(ty) + 3 });
    expect(new Set(tiles.map(keyOf)).size).toBe(36);
  });

  it("stays the same block while the position stays in the same tile", () => {
    const a = patchOrigin(45, 7, 14);
    const b = patchOrigin(45 + 0.0005, 7 + 0.0005, 14);

    expect(b).toEqual(a);
  });

  it("wraps around the world in longitude and drops the rows beyond the poles", () => {
    const west = patchTiles({ x: -2, y: 0 }, 3);
    const north = patchTiles({ x: 0, y: -2 }, 3);

    expect(west.every((t) => t.x >= 0 && t.x < 8)).toBe(true);
    expect(west).toContainEqual({ z: 3, x: 6, y: 0 });
    expect(north.every((t) => t.y >= 0)).toBe(true);
    expect(north).toHaveLength(24);
  });
});

describe("planImagery", () => {
  it("uses the most detailed zoom that stays within the number of tiles allowed", () => {
    const positions = route(8);

    const plan = planImagery(positions, { maxZoom: 15, minZoom: 11, maxTiles: 240 });

    expect(plan.zoom).toBe(15);
    expect(plan.tiles.length).toBeLessThanOrEqual(240);
    expect(plan.capped).toBe(false);
  });

  it("steps down in zoom for a long route, so it does not ask for hundreds of tiles", () => {
    const short = planImagery(route(8), { maxZoom: 15, minZoom: 11, maxTiles: 240 });
    const long = planImagery(route(60), { maxZoom: 15, minZoom: 11, maxTiles: 240 });

    expect(long.zoom).toBeLessThan(short.zoom);
    expect(long.tiles.length).toBeLessThanOrEqual(240);
    expect(long.tiles.every((t) => t.z === long.zoom)).toBe(true);
  });

  it("covers the block of tiles around every position of the route", () => {
    const positions = route(8);
    const plan = planImagery(positions, { maxZoom: 15, minZoom: 11, maxTiles: 1000 });
    const keys = new Set(plan.tiles.map(keyOf));

    for (const [lat, lon] of positions) {
      for (const tile of patchTiles(patchOrigin(lat, lon, plan.zoom), plan.zoom)) {
        expect(keys.has(keyOf(tile))).toBe(true);
      }
    }
  });

  it("says so when even the lowest zoom is over the limit", () => {
    const plan = planImagery(route(200), { maxZoom: 15, minZoom: 14, maxTiles: 10 });

    expect(plan.zoom).toBe(14);
    expect(plan.capped).toBe(true);
  });

  it("asks for nothing when there is no route", () => {
    expect(planImagery([], { maxZoom: 15, minZoom: 11, maxTiles: 240 }).tiles).toEqual([]);
  });
});

describe("planTerrain", () => {
  it("covers the square around every position, as far as the camera sees", () => {
    const positions = route(8);
    const plan = planTerrain(positions, {
      halfExtentM: 3000,
      maxZoom: 13,
      minZoom: 9,
      maxTiles: 60,
    });
    const keys = new Set(plan.tiles.map(keyOf));

    expect(plan.zoom).toBe(13);
    for (const [lat, lon] of [positions[0], positions[40], positions[80]] as LatLon[]) {
      for (const [dlat, dlon] of [
        [3000 / 111_320, 0],
        [-3000 / 111_320, 0],
        [0, 3000 / (111_320 * Math.cos((lat * Math.PI) / 180))],
      ] as const) {
        const [tx, ty] = tileCoords(lat + dlat, lon + dlon, plan.zoom);
        expect(keys.has(keyOf({ z: plan.zoom, x: Math.floor(tx), y: Math.floor(ty) }))).toBe(true);
      }
    }
  });

  it("steps down in zoom when the route is long", () => {
    const short = planTerrain(route(8), {
      halfExtentM: 3000,
      maxZoom: 13,
      minZoom: 9,
      maxTiles: 40,
    });
    const long = planTerrain(route(120), {
      halfExtentM: 3000,
      maxZoom: 13,
      minZoom: 9,
      maxTiles: 40,
    });

    expect(long.zoom).toBeLessThan(short.zoom);
    expect(long.tiles.length).toBeLessThanOrEqual(40);
  });
});
