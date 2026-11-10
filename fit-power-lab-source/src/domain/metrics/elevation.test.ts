import { describe, expect, it } from "vitest";
import { elevationChange } from "@/domain/metrics/elevation";
import { rideOf } from "@/test/rideOf";

const ride = (altitudes: number[], speed = 5) =>
  rideOf(altitudes.map((altitude, i) => ({ t: i, distance: i * 5, altitude, speed })));

describe("elevationChange", () => {
  it("adds every confirmed climb and descent", () => {
    // Up 5, down 2, up 5, down 6.
    const result = elevationChange(ride([0, 5, 3, 8, 2]), 1);

    expect(result.ascentM).toBeCloseTo(10, 6);
    expect(result.descentM).toBeCloseTo(8, 6);
  });

  it("ignores barometric steps smaller than the threshold", () => {
    const noise = Array.from({ length: 100 }, (_, i) => 100 + (i % 2) * 0.2);
    const ramp = Array.from({ length: 50 }, (_, k) => 100 + 0.2 * (k + 1));
    const result = elevationChange(ride([...noise, ...ramp]), 1);

    // Summing every rise would give about 19.8 m; the real climb is 10 m.
    expect(result.ascentM).toBeCloseTo(10, 6);
    expect(result.descentM).toBeCloseTo(0, 6);
  });

  it("reports nothing for a flat ride with only noise", () => {
    const noise = Array.from({ length: 200 }, (_, i) => 2450 + ((i * 7) % 3) * 0.2);

    expect(elevationChange(ride(noise), 1)).toEqual({ ascentM: 0, descentM: 0 });
  });

  it("uses a 1 m threshold by default", () => {
    expect(elevationChange(ride([0, 0.9, 0, 0.9])).ascentM).toBe(0);
    expect(elevationChange(ride([0, 3, 0, 3])).ascentM).toBeCloseTo(6, 6);
  });

  it("leaves out the samples recorded while stopped", () => {
    const points = Array.from({ length: 40 }, (_, i) => ({
      t: i,
      distance: i < 20 ? i * 5 : 95,
      altitude: i >= 10 && i < 20 ? 150 : 100,
      speed: i >= 10 && i < 20 ? 0 : 5,
    }));

    expect(elevationChange(rideOf(points), 1)).toEqual({ ascentM: 0, descentM: 0 });
  });

  it("returns zeros for fewer than two samples", () => {
    expect(elevationChange(ride([100]), 1)).toEqual({ ascentM: 0, descentM: 0 });
  });
});
