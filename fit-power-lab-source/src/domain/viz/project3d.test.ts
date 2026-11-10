import { describe, expect, it } from "vitest";
import { autoExaggeration, localTrack, projectRoute, type Vec3 } from "@/domain/viz/project3d";
import { rideOf, type Point } from "@/test/rideOf";

const view = { width: 400, height: 300, margin: 20, exaggeration: 1 };

/** Ten points 100 m apart going east, climbing 10 m each. */
const eastClimb: Vec3[] = Array.from({ length: 10 }, (_, i) => ({ x: 100 * i, y: 0, z: 10 * i }));

describe("localTrack", () => {
  it("turns positions into meters east and north of the first one, with the altitude", () => {
    const points: Point[] = [
      { t: 0, distance: 0, altitude: 2450, speed: 5, lat: 4.7, lon: -30.1 },
      { t: 1, distance: 5, altitude: 2455, speed: 5, lat: 4.701, lon: -30.1 },
      { t: 2, distance: 10, altitude: 2460, speed: 5, lat: 4.701, lon: -30.099 },
    ];

    const track = localTrack(rideOf(points));

    expect(track[0]).toEqual({ x: 0, y: 0, z: 2450 });
    expect(track[1]?.y).toBeCloseTo(110.5, 0);
    expect(track[1]?.x).toBeCloseTo(0, 6);
    expect(track[2]?.x).toBeCloseTo(111, 0);
    expect(track[2]?.z).toBe(2460);
  });

  it("skips the samples without a position and keeps only the visible ones", () => {
    const points: Point[] = Array.from({ length: 6 }, (_, i) => {
      const p: Point = { t: i, distance: i * 5, altitude: i, speed: 5 };
      if (i !== 2) {
        p.lat = 4.7 + i * 1e-4;
        p.lon = -30.1;
      }
      return p;
    });

    expect(localTrack(rideOf(points))).toHaveLength(5);
    expect(localTrack(rideOf(points), [3, 4])).toHaveLength(2);
    expect(localTrack(rideOf(points), null)).toEqual([]);
  });
});

describe("projectRoute", () => {
  it("seen from above, a route going east runs along the screen horizontally", () => {
    const { line } = projectRoute(eastClimb, { ...view, yaw: 0, pitch: Math.PI / 2 });

    const ys = line.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(0, 6);
    expect(line[9]?.x).toBeGreaterThan(line[0]?.x ?? Infinity);
  });

  it("turns the route around when the yaw changes", () => {
    const { line } = projectRoute(eastClimb, { ...view, yaw: Math.PI / 2, pitch: Math.PI / 2 });

    const xs = line.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(0, 6);
    // the east end now points up the screen
    expect(line[9]?.y).toBeLessThan(line[0]?.y ?? -Infinity);
  });

  it("lifts the high points above the ground shadow when seen from the side", () => {
    const { line, ground } = projectRoute(eastClimb, { ...view, yaw: 0, pitch: Math.PI / 6 });

    expect(line[0]?.y).toBeCloseTo(ground[0]?.y ?? -1, 6);
    expect(line[9]?.y).toBeLessThan(ground[9]?.y ?? -Infinity);
  });

  it("flattens the route as the camera looks from above, and shows the climb from the side", () => {
    const side = projectRoute(eastClimb, { ...view, yaw: 0, pitch: 0 });
    const top = projectRoute(eastClimb, { ...view, yaw: 0, pitch: Math.PI / 2 });

    const spread = (points: { y: number }[]) =>
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    expect(spread(side.line)).toBeGreaterThan(spread(top.line));
  });

  it("makes the climb steeper when the altitude is exaggerated", () => {
    const flat = projectRoute(eastClimb, { ...view, yaw: 0, pitch: 0, exaggeration: 1 });
    const steep = projectRoute(eastClimb, { ...view, yaw: 0, pitch: 0, exaggeration: 4 });

    const rise = (points: { x: number; y: number }[]) =>
      ((points[0]?.y ?? 0) - (points[9]?.y ?? 0)) / ((points[9]?.x ?? 0) - (points[0]?.x ?? 0));
    expect(rise(steep.line)).toBeGreaterThan(rise(flat.line) * 3.9);
  });

  it("fits everything inside the canvas, margins included", () => {
    for (const yaw of [0, 1, 2, 4]) {
      const { line, ground } = projectRoute(eastClimb, { ...view, yaw, pitch: Math.PI / 4 });

      for (const p of [...line, ...ground]) {
        expect(p.x).toBeGreaterThanOrEqual(view.margin - 1e-6);
        expect(p.x).toBeLessThanOrEqual(view.width - view.margin + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(view.margin - 1e-6);
        expect(p.y).toBeLessThanOrEqual(view.height - view.margin + 1e-6);
      }
    }
  });

  it("projects nothing for an empty route and does not fail on a single point", () => {
    expect(projectRoute([], { ...view, yaw: 0, pitch: 1 })).toEqual({ line: [], ground: [] });
    expect(projectRoute([{ x: 0, y: 0, z: 5 }], { ...view, yaw: 0, pitch: 1 }).line).toHaveLength(
      1,
    );
  });
});

describe("autoExaggeration", () => {
  it("makes the altitude about a third of the width of the route", () => {
    const points: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1000, y: 0, z: 100 },
    ];

    expect(autoExaggeration(points)).toBeCloseTo(3, 6);
  });

  it("does not exaggerate a route that already climbs a lot, nor invent relief on a flat one", () => {
    expect(
      autoExaggeration([
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 900 },
      ]),
    ).toBe(1);
    expect(
      autoExaggeration([
        { x: 0, y: 0, z: 5 },
        { x: 1000, y: 0, z: 5 },
      ]),
    ).toBe(1);
  });

  it("caps the exaggeration of a nearly flat long route", () => {
    expect(
      autoExaggeration([
        { x: 0, y: 0, z: 0 },
        { x: 20000, y: 0, z: 2 },
      ]),
    ).toBe(30);
  });
});
