import { describe, expect, it } from "vitest";
import {
  DRAFTING_PRESETS,
  POSTURE_PRESETS,
  SURFACE_PRESETS,
  WIND_PRESETS,
  matchPreset,
} from "@/domain/model/presets";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";

describe("posture presets", () => {
  it("offer the urban, hands up and low grip positions with falling drag area", () => {
    expect(POSTURE_PRESETS.map((p) => p.id)).toEqual(["urban", "handsUp", "lowGrip"]);
    expect(POSTURE_PRESETS.map((p) => p.value)).toEqual([0.55, 0.4, 0.32]);
  });

  it("include the default drag area, so a fresh model shows a preset", () => {
    expect(matchPreset(POSTURE_PRESETS, DEFAULT_MODEL_SETTINGS.cdA)).toBe("handsUp");
  });
});

describe("surface presets", () => {
  it("offer asphalt, gravel and dirt with rising rolling resistance", () => {
    expect(SURFACE_PRESETS.map((p) => p.id)).toEqual(["asphalt", "gravel", "dirt"]);
    expect(SURFACE_PRESETS.map((p) => p.value)).toEqual([0.006, 0.01, 0.015]);
  });

  it("include the default Crr", () => {
    expect(matchPreset(SURFACE_PRESETS, DEFAULT_MODEL_SETTINGS.crr)).toBe("asphalt");
  });
});

describe("drafting presets", () => {
  it("go from riding alone (no reduction) to the middle of a bunch", () => {
    expect(DRAFTING_PRESETS.map((p) => p.id)).toEqual(["alone", "pair", "smallGroup", "peloton"]);
    expect(DRAFTING_PRESETS.map((p) => p.value)).toEqual([1, 0.75, 0.65, 0.5]);
    expect(matchPreset(DRAFTING_PRESETS, DEFAULT_MODEL_SETTINGS.draftingFactor)).toBe("alone");
  });
});

describe("wind presets", () => {
  it("start with calm air and give the speed in m/s", () => {
    expect(WIND_PRESETS[0]).toEqual({ id: "calm", value: 0 });
    expect(WIND_PRESETS.map((p) => p.id)).toEqual(["calm", "light", "moderate", "fresh"]);
    expect(WIND_PRESETS.map((p) => p.value)).toEqual([0, 2.5, 5, 8]);
  });
});

describe("matchPreset", () => {
  it("finds a preset by value, tolerating float noise", () => {
    expect(matchPreset(SURFACE_PRESETS, 0.0100000000001)).toBe("gravel");
  });

  it("says custom for any other value", () => {
    expect(matchPreset(SURFACE_PRESETS, 0.0123)).toBe("custom");
  });
});
