import { describe, expect, it } from "vitest";
import { localDateKey, trainingLoad, weeklyTss } from "@/domain/metrics/trainingLoad";

// Local dates so the tests do not depend on the time zone of the machine.
const day = (month: number, date: number, hour = 8) => new Date(2024, month - 1, date, hour);

describe("localDateKey", () => {
  it("is the calendar date in local time", () => {
    expect(localDateKey(day(3, 4, 23))).toBe("2024-03-04");
    expect(localDateKey(day(12, 31, 0))).toBe("2024-12-31");
  });
});

describe("trainingLoad", () => {
  it("builds CTL and ATL as 42 and 7 day exponential averages of the daily TSS", () => {
    const rows = trainingLoad([{ startTime: day(3, 4), tss: 84 }]);

    // 84 / 42 = 2 and 84 / 7 = 12 after the first day; TSB is yesterday's CTL minus ATL.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: "2024-03-04", tss: 84, ctl: 2, atl: 12, tsb: 0 });
  });

  it("decays on the days without a ride", () => {
    const rows = trainingLoad([
      { startTime: day(3, 4), tss: 84 },
      { startTime: day(3, 6), tss: 0 },
    ]);

    expect(rows.map((r) => r.date)).toEqual(["2024-03-04", "2024-03-05", "2024-03-06"]);
    // CTL 2 * 41 / 42 and ATL 12 * 6 / 7 on the day after; TSB = 2 - 12.
    expect(rows[1]?.ctl).toBeCloseTo(1.95238, 5);
    expect(rows[1]?.atl).toBeCloseTo(10.28571, 5);
    expect(rows[1]?.tsb).toBeCloseTo(-10, 6);
  });

  it("adds the rides of the same day", () => {
    const rows = trainingLoad([
      { startTime: day(3, 4, 7), tss: 30 },
      { startTime: day(3, 4, 18), tss: 54 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tss).toBe(84);
  });

  it("puts the days in order whatever the order of the rides", () => {
    const rows = trainingLoad([
      { startTime: day(3, 6), tss: 50 },
      { startTime: day(3, 4), tss: 60 },
    ]);

    expect(rows.map((r) => r.date)).toEqual(["2024-03-04", "2024-03-05", "2024-03-06"]);
    expect(rows[0]?.tss).toBe(60);
    expect(rows[2]?.tss).toBe(50);
  });

  it("has nothing to show without rides", () => {
    expect(trainingLoad([])).toEqual([]);
  });
});

describe("weeklyTss", () => {
  it("adds the TSS of each week, from Monday to Sunday, including empty weeks", () => {
    const weeks = weeklyTss([
      { startTime: day(3, 4), tss: 50 },
      { startTime: day(3, 10), tss: 30 },
      { startTime: day(3, 25), tss: 20 },
    ]);

    expect(weeks).toEqual([
      { weekStart: "2024-03-04", tss: 80 },
      { weekStart: "2024-03-11", tss: 0 },
      { weekStart: "2024-03-18", tss: 0 },
      { weekStart: "2024-03-25", tss: 20 },
    ]);
  });
});
