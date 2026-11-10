import { describe, expect, it } from "vitest";
import { pickRows } from "@/domain/viz/tableRows";

describe("pickRows", () => {
  it("returns every row when there are few enough", () => {
    expect(pickRows([1, 2, 3], 5)).toEqual({ rows: [1, 2, 3], total: 3 });
  });

  it("takes rows evenly spaced, always including the first and the last", () => {
    const rows = Array.from({ length: 10 }, (_, i) => i);

    expect(pickRows(rows, 4)).toEqual({ rows: [0, 3, 6, 9], total: 10 });
  });

  it("never returns more rows than asked for, however long the series", () => {
    const rows = Array.from({ length: 5000 }, (_, i) => i);

    const picked = pickRows(rows, 50);

    expect(picked.rows).toHaveLength(50);
    expect(picked.total).toBe(5000);
    expect(picked.rows[0]).toBe(0);
    expect(picked.rows[49]).toBe(4999);
  });

  it("copes with no rows and with a limit of one", () => {
    expect(pickRows([], 5)).toEqual({ rows: [], total: 0 });
    expect(pickRows([7, 8, 9], 1)).toEqual({ rows: [7], total: 3 });
  });
});
