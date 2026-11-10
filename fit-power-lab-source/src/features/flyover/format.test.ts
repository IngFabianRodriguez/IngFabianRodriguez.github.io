import { describe, expect, it } from "vitest";
import {
  FLYOVER_BITRATE,
  FLYOVER_DURATIONS,
  FLYOVER_FPS,
  flyoverBitrate,
  flyoverFrames,
} from "@/features/flyover/format";

describe("the lengths of the video", () => {
  it("can be one, two, three or five minutes, at thirty frames a second", () => {
    expect(FLYOVER_DURATIONS).toEqual([1, 2, 3, 5]);
    expect(FLYOVER_FPS).toBe(30);
    expect(flyoverFrames(1)).toBe(1800);
    expect(flyoverFrames(2)).toBe(3600);
    expect(flyoverFrames(3)).toBe(5400);
    expect(flyoverFrames(5)).toBe(9000);
  });

  it("keeps the longer videos at a size that can be made and sent", () => {
    expect(FLYOVER_BITRATE).toBe(4_000_000);
    expect(flyoverBitrate(1)).toBe(4_000_000);
    expect(flyoverBitrate(2)).toBe(4_000_000);
    expect(flyoverBitrate(3)).toBe(3_000_000);
    expect(flyoverBitrate(5)).toBe(3_000_000);
    // Five minutes at that rate is about 112 MB, not 150.
    expect((flyoverBitrate(5) * 5 * 60) / 8 / 1e6).toBeLessThan(120);
  });
});
