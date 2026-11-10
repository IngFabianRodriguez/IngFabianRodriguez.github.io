import { describe, expect, it } from "vitest";
import {
  activeTimeline,
  resampleToSeconds,
  rollingMean,
  sampleDurations,
} from "@/domain/metrics/timeSeries";

describe("sampleDurations", () => {
  it("gives each sample the time up to the next one and the last sample none", () => {
    expect(sampleDurations([0, 1, 2, 3])).toEqual([1, 1, 1, 0]);
    expect(sampleDurations([0, 0.5, 1.5])).toEqual([0.5, 1, 0]);
  });

  it("counts a recording gap longer than the limit as a pause, not as riding time", () => {
    expect(sampleDurations([0, 1, 2, 62, 63])).toEqual([1, 1, 0, 1, 0]);
  });

  it("honours a custom gap limit", () => {
    expect(sampleDurations([0, 10, 12], 10)).toEqual([10, 2, 0]);
    expect(sampleDurations([0, 10, 12], 5)).toEqual([0, 2, 0]);
  });
});

describe("activeTimeline", () => {
  it("is the elapsed time with the pauses taken out", () => {
    expect(activeTimeline([0, 1, 2, 62, 63])).toEqual([0, 1, 2, 2, 3]);
  });
});

describe("resampleToSeconds", () => {
  it("returns a regular 1 Hz series that holds each value until the next sample", () => {
    expect(resampleToSeconds([0, 2, 4], [1, 2, 3])).toEqual([1, 1, 2, 2, 3]);
  });

  it("keeps already regular data as it is", () => {
    expect(resampleToSeconds([0, 1, 2, 3], [1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it("leaves a pause out of the series", () => {
    expect(resampleToSeconds([0, 1, 2, 62, 63], [10, 20, 30, 40, 50])).toEqual([10, 20, 40, 50]);
  });

  it("returns nothing for no samples", () => {
    expect(resampleToSeconds([], [])).toEqual([]);
  });
});

describe("rollingMean", () => {
  it("averages every full window, aligned to its right edge", () => {
    expect(rollingMean([1, 2, 3, 4], 2)).toEqual([1.5, 2.5, 3.5]);
    expect(rollingMean([1, 2, 3, 4], 4)).toEqual([2.5]);
  });

  it("returns nothing when the series is shorter than the window", () => {
    expect(rollingMean([1, 2, 3], 4)).toEqual([]);
  });
});
