import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadMetricsSettings,
  parseHeartRateInput,
  parseFtpInput,
  saveMetricsSettings,
} from "@/features/metrics/metricsStorage";

const KEY = "fit-power-web.metrics";

describe("metricsStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("has no FTP and no maximum heart rate when nothing was saved", () => {
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: null });
  });

  it("returns what was saved", () => {
    saveMetricsSettings({ ftp: 235, maxHeartRate: 188 });

    expect(loadMetricsSettings()).toEqual({ ftp: 235, maxHeartRate: 188 });
  });

  it("can forget a value", () => {
    saveMetricsSettings({ ftp: 235, maxHeartRate: 188 });
    saveMetricsSettings({ ftp: null, maxHeartRate: 188 });

    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: 188 });
  });

  it("ignores stored text that is not JSON or not an object", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: null });
    localStorage.setItem(KEY, "42");
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: null });
    localStorage.setItem(KEY, "null");
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: null });
  });

  it("drops only the stored value that is out of range or of the wrong type", () => {
    localStorage.setItem(KEY, JSON.stringify({ ftp: 9000, maxHeartRate: 190 }));
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: 190 });

    localStorage.setItem(KEY, JSON.stringify({ ftp: 250, maxHeartRate: "190" }));
    expect(loadMetricsSettings()).toEqual({ ftp: 250, maxHeartRate: null });

    localStorage.setItem(KEY, JSON.stringify({ ftp: 250.5, maxHeartRate: 20 }));
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: null });
  });

  it("does not fail when the storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => saveMetricsSettings({ ftp: 235, maxHeartRate: null })).not.toThrow();
    expect(loadMetricsSettings()).toEqual({ ftp: null, maxHeartRate: null });
  });
});

describe("parseFtpInput", () => {
  it("accepts a whole number of watts in range", () => {
    expect(parseFtpInput("235")).toEqual({ ok: true, value: 235 });
    expect(parseFtpInput(" 235 ")).toEqual({ ok: true, value: 235 });
  });

  it("reads an empty box as no value", () => {
    expect(parseFtpInput("")).toEqual({ ok: true, value: null });
    expect(parseFtpInput("   ")).toEqual({ ok: true, value: null });
  });

  it("rejects text, decimals and numbers out of range", () => {
    for (const raw of ["abc", "23.5", "-200", "49", "601"]) {
      expect(parseFtpInput(raw)).toEqual({ ok: false });
    }
  });
});

describe("parseHeartRateInput", () => {
  it("accepts a whole number of bpm in range", () => {
    expect(parseHeartRateInput("188")).toEqual({ ok: true, value: 188 });
    expect(parseHeartRateInput("")).toEqual({ ok: true, value: null });
  });

  it("rejects what is not a plausible maximum heart rate", () => {
    for (const raw of ["99", "231", "x", "1.5e2"]) {
      expect(parseHeartRateInput(raw)).toEqual({ ok: false });
    }
  });
});
