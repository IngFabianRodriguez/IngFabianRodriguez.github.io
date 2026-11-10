import { describe, expect, it } from "vitest";
import { buildTimeline, crossfade, ease, phaseAt } from "@/domain/flyover/timeline";

describe("buildTimeline", () => {
  it("has an opening of a few seconds, the flight, and a closing, that add up to the whole video", () => {
    const one = buildTimeline(1800, 30);

    expect(one.total).toBe(1800);
    expect(one.intro + one.flight + one.outro).toBe(1800);
    // About 5 s of opening and 6 s of closing in a one minute video.
    expect(one.intro).toBeGreaterThanOrEqual(120);
    expect(one.intro).toBeLessThanOrEqual(150);
    expect(one.outro).toBeGreaterThanOrEqual(150);
    expect(one.outro).toBeLessThanOrEqual(180);
  });

  it("does not let the opening and the closing grow with the length of the video", () => {
    const five = buildTimeline(9000, 30);

    expect(five.intro).toBe(150);
    expect(five.outro).toBe(180);
    expect(five.flight).toBe(9000 - 330);
  });

  it("gives the opening and the closing a smaller share of a very short video", () => {
    const short = buildTimeline(60, 30);

    expect(short.intro + short.flight + short.outro).toBe(60);
    expect(short.flight).toBeGreaterThan(short.intro + short.outro);
  });

  it("has no opening and no closing when there are too few frames for them", () => {
    expect(buildTimeline(10, 30)).toEqual({ total: 10, intro: 0, outro: 0, flight: 10 });
  });
});

describe("phaseAt", () => {
  const timeline = buildTimeline(1800, 30);

  it("goes through the opening, the flight and the closing in order", () => {
    expect(phaseAt(timeline, 0).kind).toBe("intro");
    expect(phaseAt(timeline, timeline.intro - 1).kind).toBe("intro");
    expect(phaseAt(timeline, timeline.intro).kind).toBe("flight");
    expect(phaseAt(timeline, timeline.intro + timeline.flight - 1).kind).toBe("flight");
    expect(phaseAt(timeline, timeline.intro + timeline.flight).kind).toBe("outro");
    expect(phaseAt(timeline, 1799).kind).toBe("outro");
  });

  it("numbers the frames of the flight from 0, so the first one is the start of the route", () => {
    expect(phaseAt(timeline, timeline.intro)).toEqual({ kind: "flight", index: 0 });
    expect(phaseAt(timeline, timeline.intro + 10)).toEqual({ kind: "flight", index: 10 });
    expect(phaseAt(timeline, timeline.intro + timeline.flight - 1)).toEqual({
      kind: "flight",
      index: timeline.flight - 1,
    });
  });

  it("moves through the opening towards the flight, which is where it ends", () => {
    const first = phaseAt(timeline, 0);
    const last = phaseAt(timeline, timeline.intro - 1);

    expect(first).toEqual({ kind: "intro", t: 0 });
    expect(last.kind === "intro" && last.t).toBeGreaterThan(0.9);
    expect(last.kind === "intro" && last.t).toBeLessThan(1);
  });

  it("moves through the closing away from the flight, ending exactly at the overview", () => {
    const first = phaseAt(timeline, timeline.intro + timeline.flight);
    const last = phaseAt(timeline, 1799);

    expect(first.kind === "outro" && first.t).toBeGreaterThan(0);
    expect(first.kind === "outro" && first.t).toBeLessThan(0.05);
    expect(last).toEqual({ kind: "outro", t: 1 });
  });

  it("keeps a frame beyond the ends in the first or the last phase", () => {
    expect(phaseAt(timeline, -5).kind).toBe("intro");
    expect(phaseAt(timeline, 5000).kind).toBe("outro");
  });

  it("is only the flight when there is no opening and no closing", () => {
    const flightOnly = buildTimeline(10, 30);

    expect(phaseAt(flightOnly, 0)).toEqual({ kind: "flight", index: 0 });
    expect(phaseAt(flightOnly, 9)).toEqual({ kind: "flight", index: 9 });
  });
});

describe("ease", () => {
  it("starts and ends gently, and stays between 0 and 1", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5, 9);
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(0.9)).toBeGreaterThan(0.9);
    expect(ease(-3)).toBe(0);
    expect(ease(4)).toBe(1);
  });
});

describe("crossfade", () => {
  it("shows the overview alone at the start of the opening and the detailed map alone in the flight", () => {
    expect(crossfade({ kind: "intro", t: 0 })).toEqual({ overview: 1, chase: 0 });
    expect(crossfade({ kind: "flight", index: 5 })).toEqual({ overview: 0, chase: 1 });
  });

  it("swaps the overview for the detailed map late in the opening, never leaving a gap", () => {
    const weights = [0, 0.3, 0.55, 0.65, 0.8, 0.95].map((t) => crossfade({ kind: "intro", t }));

    for (const w of weights) expect(w.overview + w.chase).toBeCloseTo(1, 9);
    expect(weights[1]?.chase).toBe(0);
    expect(weights[3]?.chase).toBeGreaterThan(0);
    expect(weights[3]?.chase).toBeLessThan(1);
    expect(weights[5]?.chase).toBe(1);
  });

  it("swaps the detailed map for the overview early in the closing", () => {
    const weights = [0.05, 0.3, 0.45, 0.7, 1].map((t) => crossfade({ kind: "outro", t }));

    for (const w of weights) expect(w.overview + w.chase).toBeCloseTo(1, 9);
    expect(weights[0]?.overview).toBe(0);
    expect(weights[1]?.overview).toBeGreaterThan(0);
    expect(weights[1]?.overview).toBeLessThan(1);
    expect(weights[3]?.overview).toBe(1);
    expect(weights[4]?.overview).toBe(1);
  });
});
