import { describe, expect, it } from "vitest";
import { GRADE_BANDS, gradeBand, gradeColor, gradeStops } from "@/domain/viz/grade";

describe("gradeBand", () => {
  it.each([
    [-12, 0],
    [-6, 1],
    [-4, 1],
    [-3, 2],
    [-1, 3],
    [0, 3],
    [0.9, 3],
    [1, 4],
    [3, 5],
    [6, 6],
    [9.9, 6],
    [10, 7],
    [25, 7],
  ])("puts a grade of %f %% in band %i", (grade, band) => {
    expect(gradeBand(grade)).toBe(band);
  });

  it("has eight bands with their limits, from steep descent to steep climb", () => {
    expect(GRADE_BANDS).toHaveLength(8);
    expect(GRADE_BANDS[0]).toMatchObject({ min: null, max: -6 });
    expect(GRADE_BANDS[3]).toMatchObject({ min: -1, max: 1 });
    expect(GRADE_BANDS[7]).toMatchObject({ min: 10, max: null });
  });
});

describe("gradeColor", () => {
  it("gives every band its own color, and the color of the band the grade falls in", () => {
    expect(new Set(GRADE_BANDS.map((b) => b.color)).size).toBe(8);
    expect(gradeColor(-8)).toBe(GRADE_BANDS[0]?.color);
    expect(gradeColor(0)).toBe(GRADE_BANDS[3]?.color);
    expect(gradeColor(12)).toBe(GRADE_BANDS[7]?.color);
  });
});

describe("gradeStops", () => {
  const pt = (x: number, grade: number) => ({ x, y: 2450, grade });

  it("colors the whole profile with one color when the grade stays in a band", () => {
    expect(gradeStops([pt(0, 0), pt(1, 0.5), pt(2, -0.5)])).toEqual([
      { offset: 0, color: gradeColor(0) },
      { offset: 1, color: gradeColor(0) },
    ]);
  });

  it("changes color with a hard edge halfway between the two samples that differ", () => {
    expect(gradeStops([pt(0, 0), pt(1, 0), pt(2, 5), pt(3, 5)])).toEqual([
      { offset: 0, color: gradeColor(0) },
      { offset: 0.5, color: gradeColor(0) },
      { offset: 0.5, color: gradeColor(5) },
      { offset: 1, color: gradeColor(5) },
    ]);
  });

  it("puts the offsets between 0 and 1 relative to the first and last x of the profile", () => {
    const stops = gradeStops([pt(10, 0), pt(14, 0), pt(18, 8)]);

    expect(stops[0]?.offset).toBe(0);
    expect(stops[stops.length - 1]?.offset).toBe(1);
    expect(stops.every((s) => s.offset >= 0 && s.offset <= 1)).toBe(true);
    expect(stops.map((s) => s.offset)).toEqual([0, 0.75, 0.75, 1]);
  });

  it("handles a single point and an empty profile", () => {
    expect(gradeStops([pt(5, 0)])).toEqual([
      { offset: 0, color: gradeColor(0) },
      { offset: 1, color: gradeColor(0) },
    ]);
    expect(gradeStops([])).toEqual([]);
  });
});
