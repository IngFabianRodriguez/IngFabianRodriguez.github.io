import { describe, expect, it } from "vitest";
import { appReducer, initialAppState, type LoadedRide } from "@/app/appState";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { rideOf } from "@/test/rideOf";

function loaded(id: string): LoadedRide {
  return {
    id,
    fileName: `${id}.fit`,
    source: "fit",
    fit: { messages: [] },
    ride: rideOf([{ t: 0, distance: 0, altitude: 0, speed: 1 }]),
    loadedAt: 0,
  };
}

describe("appReducer", () => {
  it("starts with no weights, no rides, metric units, English and the default model", () => {
    expect(initialAppState()).toMatchObject({
      weights: null,
      rides: [],
      activeId: null,
      compareId: null,
      units: "metric",
      locale: "en",
      theme: "system",
      xAxis: "distance",
      mapVariable: "power",
      cursorKm: null,
      range: null,
      model: DEFAULT_MODEL_SETTINGS,
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 0 },
    });
  });

  it("keeps the confirmed weights, and forgets them when set to null", () => {
    const a = appReducer(initialAppState(), {
      type: "setWeights",
      weights: { riderKg: 70, bikeKg: 9 },
    });
    expect(a.weights).toEqual({ riderKg: 70, bikeKg: 9 });
    expect(appReducer(a, { type: "setWeights", weights: null }).weights).toBeNull();
  });

  it("merges model changes and can reset them", () => {
    const a = appReducer(initialAppState(), {
      type: "setModel",
      patch: { cdA: 0.32, windSpeedMs: 3 },
    });
    expect(a.model).toEqual({ ...DEFAULT_MODEL_SETTINGS, cdA: 0.32, windSpeedMs: 3 });
    expect(appReducer(a, { type: "resetModel" }).model).toEqual(DEFAULT_MODEL_SETTINGS);
  });

  it("makes a newly added ride the active one and keeps every ride", () => {
    const a = appReducer(initialAppState(), { type: "addRide", ride: loaded("r1") });
    const b = appReducer(a, { type: "addRide", ride: loaded("r2") });
    expect(b.rides.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(b.activeId).toBe("r2");
  });

  it("replaces a ride that is added again with the same id instead of listing it twice", () => {
    let s = appReducer(initialAppState(), { type: "addRide", ride: loaded("r1") });
    s = appReducer(s, { type: "addRide", ride: { ...loaded("r1"), fileName: "renamed.fit" } });

    expect(s.rides.map((r) => r.fileName)).toEqual(["renamed.fit"]);
    expect(s.activeId).toBe("r1");
  });

  it("clears the cursor and the range when another ride becomes active", () => {
    let s = appReducer(initialAppState(), { type: "addRide", ride: loaded("r1") });
    s = appReducer(s, { type: "setCursorKm", km: 4 });
    s = appReducer(s, { type: "setRange", range: { fromKm: 1, toKm: 3 } });
    s = appReducer(s, { type: "addRide", ride: loaded("r2") });
    expect(s.cursorKm).toBeNull();
    expect(s.range).toBeNull();
  });

  it("selects an existing ride only", () => {
    let s = appReducer(initialAppState(), { type: "addRide", ride: loaded("r1") });
    s = appReducer(s, { type: "addRide", ride: loaded("r2") });
    expect(appReducer(s, { type: "selectRide", id: "r1" }).activeId).toBe("r1");
    expect(appReducer(s, { type: "selectRide", id: "nope" }).activeId).toBe("r2");
  });

  it("removing a ride activates the last remaining one and clears a compare of it", () => {
    let s = appReducer(initialAppState(), { type: "addRide", ride: loaded("r1") });
    s = appReducer(s, { type: "addRide", ride: loaded("r2") });
    s = appReducer(s, { type: "setCompare", id: "r1" });
    s = appReducer(s, { type: "removeRide", id: "r1" });
    expect(s.compareId).toBeNull();
    expect(s.activeId).toBe("r2");
    s = appReducer(s, { type: "removeRide", id: "r2" });
    expect(s.activeId).toBeNull();
    expect(s.rides).toEqual([]);
  });

  it("merges map privacy changes", () => {
    let s = appReducer(initialAppState(), { type: "setMapPrivacy", patch: { hideEndsM: 300 } });
    s = appReducer(s, { type: "setMapPrivacy", patch: { mode: "none" } });
    expect(s.mapPrivacy).toEqual({ mode: "none", customUrl: "", hideEndsM: 300 });
  });

  it("asks for the public terrain relief until the user chooses otherwise, and merges changes", () => {
    expect(initialAppState().terrainPrivacy).toEqual({ mode: "public", customUrl: "" });

    let s = appReducer(initialAppState(), { type: "setTerrainPrivacy", patch: { mode: "custom" } });
    s = appReducer(s, {
      type: "setTerrainPrivacy",
      patch: { customUrl: "https://t.example/{z}/{x}/{y}.png" },
    });

    expect(s.terrainPrivacy).toEqual({
      mode: "custom",
      customUrl: "https://t.example/{z}/{x}/{y}.png",
    });
    expect(s.mapPrivacy).toEqual(initialAppState().mapPrivacy);
  });

  it("stores the preferences and the shared view state", () => {
    let s = appReducer(initialAppState(), { type: "setUnits", units: "imperial" });
    s = appReducer(s, { type: "setLocale", locale: "es" });
    s = appReducer(s, { type: "setTheme", theme: "dark" });
    s = appReducer(s, { type: "setXAxis", axis: "time" });
    s = appReducer(s, { type: "setMapVariable", variable: "speed" });
    expect(s).toMatchObject({
      units: "imperial",
      locale: "es",
      theme: "dark",
      xAxis: "time",
      mapVariable: "speed",
    });
  });
});
