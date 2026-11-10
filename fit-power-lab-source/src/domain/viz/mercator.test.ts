import { describe, expect, it } from "vitest";
import type { LatLon } from "@/domain/route";
import { fitView, projectToBox, tilesCovering, TILE_SIZE } from "@/domain/viz/mercator";

const box = { width: 800, height: 400, padding: 40 };

/** A route heading north-east, about 2 km on each side. */
const route: LatLon[] = [
  [4.7, -30.1],
  [4.71, -30.09],
  [4.72, -30.08],
];

function viewOf(positions: LatLon[] = route, maxZoom = 18) {
  const view = fitView(positions, box, maxZoom);
  if (!view) throw new Error("expected a view");
  return view;
}

describe("fitView", () => {
  it("keeps every point of the route inside the padded box", () => {
    const view = viewOf();

    for (const [lat, lon] of route) {
      const p = projectToBox(view, lat, lon);
      expect(p.x).toBeGreaterThanOrEqual(box.padding - 0.5);
      expect(p.x).toBeLessThanOrEqual(box.width - box.padding + 0.5);
      expect(p.y).toBeGreaterThanOrEqual(box.padding - 0.5);
      expect(p.y).toBeLessThanOrEqual(box.height - box.padding + 0.5);
    }
  });

  it("uses the box as much as it can: the route touches one padded side", () => {
    const view = viewOf();
    const points = route.map(([lat, lon]) => projectToBox(view, lat, lon));
    const width = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const height = Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));

    const fillsWidth = Math.abs(width - (box.width - 2 * box.padding)) < 1;
    const fillsHeight = Math.abs(height - (box.height - 2 * box.padding)) < 1;
    expect(fillsWidth || fillsHeight).toBe(true);
  });

  it("centres the route in the box", () => {
    const view = viewOf();
    const points = route.map(([lat, lon]) => projectToBox(view, lat, lon));
    const centreX = (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2;
    const centreY = (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2;

    expect(centreX).toBeCloseTo(box.width / 2, 0);
    expect(centreY).toBeCloseTo(box.height / 2, 0);
  });

  it("puts north up and east to the right", () => {
    const view = viewOf();
    const start = projectToBox(view, 4.7, -30.1);
    const end = projectToBox(view, 4.72, -30.08);

    expect(end.y).toBeLessThan(start.y);
    expect(end.x).toBeGreaterThan(start.x);
  });

  it("does not zoom in past the limit when the route is a single point", () => {
    const view = viewOf([[4.7, -30.1]], 16);

    expect(view.zoom).toBe(16);
    const p = projectToBox(view, 4.7, -30.1);
    expect(p.x).toBeCloseTo(box.width / 2, 0);
    expect(p.y).toBeCloseTo(box.height / 2, 0);
  });

  it("has no view for a ride without positions", () => {
    expect(fitView([], box, 18)).toBeNull();
  });
});

describe("tilesCovering", () => {
  it("covers the whole box with tiles of the whole zoom just below the view", () => {
    const view = viewOf();
    const tiles = tilesCovering(view, box);
    const zoom = Math.floor(view.zoom);
    const scale = 2 ** (view.zoom - zoom);
    const size = TILE_SIZE * scale;

    expect(tiles.length).toBeGreaterThan(0);
    expect(new Set(tiles.map((t) => t.z))).toEqual(new Set([zoom]));
    expect(Math.min(...tiles.map((t) => t.dx))).toBeLessThanOrEqual(0);
    expect(Math.min(...tiles.map((t) => t.dy))).toBeLessThanOrEqual(0);
    expect(Math.max(...tiles.map((t) => t.dx + size))).toBeGreaterThanOrEqual(box.width);
    expect(Math.max(...tiles.map((t) => t.dy + size))).toBeGreaterThanOrEqual(box.height);
    expect(tiles.every((t) => t.size === size)).toBe(true);
  });

  it("asks for each tile once, with x and y in the range of its zoom", () => {
    const view = viewOf();
    const tiles = tilesCovering(view, box);
    const limit = 2 ** Math.floor(view.zoom);

    expect(new Set(tiles.map((t) => `${t.z}/${t.x}/${t.y}`)).size).toBe(tiles.length);
    expect(tiles.every((t) => t.x >= 0 && t.x < limit && t.y >= 0 && t.y < limit)).toBe(true);
  });

  it("places the tile that holds a point under that point", () => {
    const view = viewOf();
    const tiles = tilesCovering(view, box);
    const p = projectToBox(view, 4.71, -30.09);

    const holder = tiles.find(
      (t) => p.x >= t.dx && p.x < t.dx + t.size && p.y >= t.dy && p.y < t.dy + t.size,
    );
    expect(holder).toBeDefined();
  });
});
