import { describe, expect, it } from "vitest";
import { baseName, exportFileName } from "@/domain/exporters/fileName";
import { elevationChange } from "@/domain/tools/climb";

describe("exportFileName", () => {
  it("replaces the extension of the ride file", () => {
    expect(exportFileName("2024-02-25-08-30-59.fit", "csv")).toBe("2024-02-25-08-30-59.csv");
    expect(exportFileName("RIDE.FIT", "gpx")).toBe("RIDE.gpx");
  });

  it("adds the extension to a name without one and keeps other dots", () => {
    expect(exportFileName("ride", "tcx")).toBe("ride.tcx");
    expect(exportFileName("my.ride.fit", "json")).toBe("my.ride.json");
    expect(baseName("a.fit")).toBe("a");
  });
});

describe("elevationChange", () => {
  it("adds up climbs and descents", () => {
    expect(elevationChange([0, 5, 10, 4, 12])).toEqual({ ascent: 18, descent: 6 });
  });

  it("ignores jitter smaller than the dead band", () => {
    const noisy = [100, 100.4, 99.8, 100.5, 100.2, 99.9, 100.6];

    expect(elevationChange(noisy)).toEqual({ ascent: 0, descent: 0 });
  });

  it("counts a slow climb made of steps smaller than the dead band", () => {
    const ramp = Array.from({ length: 21 }, (_, i) => i * 0.5);

    expect(elevationChange(ramp).ascent).toBeCloseTo(10, 5);
  });

  it("returns zeros for no data", () => {
    expect(elevationChange([])).toEqual({ ascent: 0, descent: 0 });
  });
});
