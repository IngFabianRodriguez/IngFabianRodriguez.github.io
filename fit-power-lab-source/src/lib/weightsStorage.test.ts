import { beforeEach, describe, expect, it } from "vitest";
import { loadWeights, saveWeights } from "@/lib/weightsStorage";

describe("weightsStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing was saved", () => {
    expect(loadWeights()).toBeNull();
  });

  it("returns what was saved", () => {
    saveWeights({ riderKg: 72.5, bikeKg: 9 });
    expect(loadWeights()).toEqual({ riderKg: 72.5, bikeKg: 9 });
  });

  it("ignores stored data that is corrupted or out of range", () => {
    localStorage.setItem("fit-power-web.weights", "{not json");
    expect(loadWeights()).toBeNull();
    localStorage.setItem("fit-power-web.weights", JSON.stringify({ riderKg: -5, bikeKg: 9 }));
    expect(loadWeights()).toBeNull();
  });
});
