import { describe, expect, it } from "vitest";
import { createTranslator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";
import {
  buildCardModel,
  cardRoute,
  CARD_HEIGHT,
  CARD_WIDTH,
  drawSummaryCard,
} from "@/features/share/summaryCard";
import { rideOf, type Point } from "@/test/rideOf";

/** A 1 km ride in 100 s heading north, with GPS. */
const ride = rideOf(
  Array.from({ length: 101 }, (_, i): Point => ({
    t: i,
    distance: 10 * i,
    altitude: 2450,
    speed: 10,
    lat: 4.7 + i * 1e-4,
    lon: -30.1 + i * 1e-5,
  })),
);
const watts = Array<number>(101).fill(180);
const options = {
  units: "metric",
  locale: "en",
  t: createTranslator(MESSAGES, "en"),
  hideEndsM: 0,
} as const;

function recorder() {
  const calls: [string, ...unknown[]][] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_target, name) =>
      name === "canvas" ? undefined : (...args: unknown[]) => calls.push([String(name), ...args]),
    set: (_target, name, value) => {
      calls.push([`set ${String(name)}`, value]);
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("buildCardModel", () => {
  it("has the title, the date, and the distance, time and average power of the ride", () => {
    const model = buildCardModel({ ride, watts }, "C:\\rides\\Morning ride.fit", options);

    expect(model.title).toBe("Morning ride");
    expect(model.dateText).toBe("February 25, 2024");
    expect(model.stats).toEqual([
      { label: "Distance", value: "1 km" },
      { label: "Time", value: "1:40" },
      { label: "Avg power", value: "180 W" },
    ]);
  });

  it("writes the distance in miles and the date in Spanish when the app does", () => {
    const model = buildCardModel({ ride, watts }, "ride.fit", {
      ...options,
      units: "imperial",
      locale: "es",
      t: createTranslator(MESSAGES, "es"),
    });

    expect(model.dateText).toBe("25 de febrero de 2024");
    expect(model.stats[0]).toEqual({ label: "Distancia", value: "0.6 mi" });
    expect(model.stats[2]?.label).toBe("Potencia prom.");
  });
});

describe("drawSummaryCard", () => {
  it("draws the card background, the texts and a mini route", () => {
    const { ctx, calls } = recorder();
    const model = buildCardModel({ ride, watts }, "Morning ride.fit", options);

    drawSummaryCard(ctx, model, cardRoute({ ride }, 0));

    expect(calls[0]).toEqual(["set fillStyle", "#0f172a"]);
    expect(calls).toContainEqual(["fillRect", 0, 0, CARD_WIDTH, CARD_HEIGHT]);
    const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(texts).toEqual([
      "Morning ride",
      "February 25, 2024",
      "Distance",
      "1 km",
      "Time",
      "1:40",
      "Avg power",
      "180 W",
    ]);
    expect(calls.filter((c) => c[0] === "moveTo")).toHaveLength(1);
    expect(calls.filter((c) => c[0] === "lineTo")).toHaveLength(100);
    expect(calls.filter((c) => c[0] === "stroke")).toHaveLength(1);
  });

  it("keeps the route inside the right half of the card", () => {
    const { ctx, calls } = recorder();

    drawSummaryCard(ctx, { title: "t", dateText: "d", stats: [] }, cardRoute({ ride }, 0));

    const xs = calls
      .filter((c) => c[0] === "lineTo" || c[0] === "moveTo")
      .map((c) => c[1] as number);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(700);
    expect(Math.max(...xs)).toBeLessThanOrEqual(CARD_WIDTH);
  });

  it("draws no route for a ride without GPS, and none inside the hidden ends", () => {
    const { ctx, calls } = recorder();
    const noGps = rideOf(
      ride.samples.map((s) => ({ t: s.t, distance: s.distance, altitude: 0, speed: 1 })),
    );

    drawSummaryCard(ctx, { title: "t", dateText: "d", stats: [] }, cardRoute({ ride: noGps }, 0));

    expect(calls.filter((c) => c[0] === "moveTo")).toHaveLength(0);
    const hidden = cardRoute({ ride }, 600);
    expect(hidden.flat().length).toBeLessThan(ride.samples.length);
    expect(cardRoute({ ride }, 2000)).toEqual([]);
  });
});
