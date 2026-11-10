import { describe, expect, it } from "vitest";
import { buildRibbon, type RibbonColors } from "@/domain/flyover/ribbon";

const colors: RibbonColors = { done: [0, 0.5, 1, 1], ahead: [1, 1, 1, 0.5] };
const line = [
  { x: 0, y: 5, z: 0 },
  { x: 0, y: 6, z: -10 },
  { x: 0, y: 7, z: -20 },
];
const options = { halfWidthM: 2, liftM: 1, maxGapM: 50, colors };

function vertex(ribbon: ReturnType<typeof buildRibbon>, i: number) {
  return {
    x: ribbon.positions[i * 3] ?? NaN,
    y: ribbon.positions[i * 3 + 1] ?? NaN,
    z: ribbon.positions[i * 3 + 2] ?? NaN,
    color: Array.from(ribbon.colors.slice(i * 4, i * 4 + 4)),
  };
}

describe("buildRibbon", () => {
  it("has two triangles for each stretch between two points", () => {
    const ribbon = buildRibbon(line, [true, true, true], options);

    expect(ribbon.vertexCount).toBe(12);
    expect(ribbon.positions).toHaveLength(36);
    expect(ribbon.colors).toHaveLength(48);
  });

  it("is as wide as asked, centered on the route and lifted over the ground", () => {
    const ribbon = buildRibbon(line, [true, true, true], options);

    const xs = Array.from({ length: 6 }, (_, i) => vertex(ribbon, i).x);
    expect(Math.min(...xs)).toBeCloseTo(-2, 6);
    expect(Math.max(...xs)).toBeCloseTo(2, 6);
    const first = Array.from({ length: 6 }, (_, i) => vertex(ribbon, i));
    for (const v of first) expect(v.y).toBeGreaterThanOrEqual(6);
    expect(Math.min(...first.map((v) => v.y))).toBeCloseTo(6, 6);
  });

  it("has the colour of what has been travelled and of what is still ahead", () => {
    const ribbon = buildRibbon(line, [true, false, false], options);

    for (let i = 0; i < 6; i++) expect(vertex(ribbon, i).color).toEqual([0, 0.5, 1, 1]);
    for (let i = 6; i < 12; i++) expect(vertex(ribbon, i).color).toEqual([1, 1, 1, 0.5]);
  });

  it("does not join two points that are far apart, as after a gap in the recording", () => {
    const withGap = [...line, { x: 500, y: 7, z: -520 }, { x: 500, y: 7, z: -530 }];

    const ribbon = buildRibbon(withGap, [true, true, true, true, true], options);

    expect(ribbon.vertexCount).toBe(18);
  });

  it("skips a stretch that has no length", () => {
    const still = [line[0]!, line[0]!, line[1]!];

    expect(buildRibbon(still, [true, true, true], options).vertexCount).toBe(6);
  });

  it("is empty with fewer than two points", () => {
    expect(buildRibbon([], [], options).vertexCount).toBe(0);
    expect(buildRibbon([line[0]!], [true], options).vertexCount).toBe(0);
  });

  it("turns with the route", () => {
    const east = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];

    const ribbon = buildRibbon(east, [true, true], options);

    const zs = Array.from({ length: 6 }, (_, i) => vertex(ribbon, i).z);
    expect(Math.min(...zs)).toBeCloseTo(-2, 6);
    expect(Math.max(...zs)).toBeCloseTo(2, 6);
  });
});
