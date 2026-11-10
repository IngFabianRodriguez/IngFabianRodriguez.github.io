import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { loadSettings, saveSettings } from "@/lib/settingsStorage";

describe("settingsStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns nothing when nothing was saved", () => {
    expect(loadSettings()).toEqual({});
  });

  it("returns what was saved", () => {
    const model = { ...DEFAULT_MODEL_SETTINGS, cdA: 0.33 };
    const mapPrivacy = {
      mode: "custom" as const,
      customUrl: "https://tiles.example/{z}/{x}/{y}.png",
      hideEndsM: 250,
    };
    saveSettings({ units: "imperial", locale: "es", theme: "dark", model, mapPrivacy });
    expect(loadSettings()).toEqual({
      units: "imperial",
      locale: "es",
      theme: "dark",
      model,
      mapPrivacy,
    });
  });

  it("ignores fields with unknown values and keeps the valid ones", () => {
    localStorage.setItem(
      "fit-power-web.settings",
      JSON.stringify({
        units: "furlongs",
        locale: "es",
        theme: 7,
        model: { cdA: "big", crr: 0.01 },
      }),
    );
    expect(loadSettings()).toEqual({
      locale: "es",
      model: { ...DEFAULT_MODEL_SETTINGS, crr: 0.01 },
    });
  });

  it("keeps only valid map privacy fields", () => {
    localStorage.setItem(
      "fit-power-web.settings",
      JSON.stringify({ mapPrivacy: { mode: "satellite", customUrl: 5, hideEndsM: 120 } }),
    );
    expect(loadSettings()).toEqual({ mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 120 } });
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("fit-power-web.settings", "{not json");
    expect(loadSettings()).toEqual({});
  });
});
