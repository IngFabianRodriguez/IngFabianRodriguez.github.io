import { describe, expect, it } from "vitest";
import { formatKmTick } from "@/features/model/format";

describe("formatKmTick", () => {
  it("shows a distance tick with at most one decimal", () => {
    expect(formatKmTick(0.001)).toBe("0");
    expect(formatKmTick(3.001)).toBe("3");
    expect(formatKmTick(11.014)).toBe("11");
    expect(formatKmTick(2.5)).toBe("2.5");
    expect(formatKmTick(7.96)).toBe("8");
  });
});
