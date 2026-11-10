import { describe, expect, it } from "vitest";
import { LocalFrame } from "@/domain/flyover/localFrame";
import { groundMetersPerTile, tileCoords } from "@/domain/viz/mercator";

const frame = new LocalFrame(45, 7);

describe("LocalFrame", () => {
  it("has its origin at the reference position", () => {
    expect(frame.toLocal(45, 7)).toEqual({ e: 0, n: 0 });
  });

  it("measures east and north in meters on the ground", () => {
    const east = frame.toLocal(45, 7.001);
    const north = frame.toLocal(45.001, 7);

    // 0.001 degrees of longitude at 45 degrees is about 78.7 m; of latitude, about 111.2 m.
    expect(east.e).toBeCloseTo(78.7, 0);
    expect(east.n).toBeCloseTo(0, 6);
    expect(north.n).toBeCloseTo(111.2, 0);
    expect(north.e).toBeCloseTo(0, 6);
  });

  it("goes back to the latitude and longitude it came from", () => {
    for (const [lat, lon] of [
      [45.02, 7.03],
      [44.97, 6.95],
      [45, 7],
    ] as const) {
      const { e, n } = frame.toLocal(lat, lon);
      const [backLat, backLon] = frame.toLatLon(e, n);

      expect(backLat).toBeCloseTo(lat, 9);
      expect(backLon).toBeCloseTo(lon, 9);
    }
  });

  it("gives the tile position of a point exactly as the map does", () => {
    for (const zoom of [10, 13, 15]) {
      for (const [lat, lon] of [
        [45.03, 7.04],
        [44.96, 6.97],
      ] as const) {
        const { e, n } = frame.toLocal(lat, lon);
        const [tx, ty] = frame.tileCoords(e, n, zoom);
        const [ex, ey] = tileCoords(lat, lon, zoom);

        expect(tx).toBeCloseTo(ex, 6);
        expect(ty).toBeCloseTo(ey, 6);
      }
    }
  });

  it("says how many meters of ground a tile spans at its latitude", () => {
    expect(frame.metersPerTile(14)).toBeCloseTo(groundMetersPerTile(45, 14), 6);
  });
});
