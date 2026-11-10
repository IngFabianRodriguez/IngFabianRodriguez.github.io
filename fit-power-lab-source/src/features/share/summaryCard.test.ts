import { describe, expect, it } from "vitest";
import { createTranslator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";
import type { MapScene } from "@/features/share/mapScene";
import {
  buildCardModel,
  buildCardScene,
  CARD_HEIGHT,
  CARD_MAP_BOX,
  CARD_WIDTH,
  drawSummaryCard,
} from "@/features/share/summaryCard";
import { canvasRecorder } from "@/test/canvasRecorder";
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

const backdrop = { backdrop: true } as unknown as CanvasImageSource;
const noMap: MapScene = { box: CARD_MAP_BOX, lines: [], backdrop: null, attribution: "" };

function sceneOf(overrides: Partial<Parameters<typeof buildCardScene>[1]> = {}) {
  return buildCardScene(
    { ride },
    {
      hideEndsM: 0,
      tiles: {
        url: "https://tile.example.org/{z}/{x}/{y}.png",
        attribution: "© Test maps",
        maxZoom: 19,
      },
      loadTile: () => Promise.resolve(backdrop),
      createCanvas: () =>
        ({
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: () => undefined }),
        }) as unknown as HTMLCanvasElement,
      ...overrides,
    },
  );
}

describe("buildCardScene", () => {
  it("puts the map in the right half of the card, with the tiles behind the route", async () => {
    const scene = await sceneOf();

    expect(scene.box.x).toBeGreaterThanOrEqual(CARD_WIDTH / 2);
    expect(scene.box.x + scene.box.width).toBeLessThanOrEqual(CARD_WIDTH);
    expect(scene.box.y + scene.box.height).toBeLessThanOrEqual(CARD_HEIGHT);
    expect(scene.backdrop).not.toBeNull();
    expect(scene.lines.flat()).toHaveLength(101);
  });

  it("is only the route when the map has no background", async () => {
    const scene = await sceneOf({ tiles: { url: null, attribution: "", maxZoom: 19 } });

    expect(scene.backdrop).toBeNull();
    expect(scene.lines.flat()).toHaveLength(101);
  });

  it("leaves out the hidden ends, and has no route at all inside a ride that is all hidden end", async () => {
    const hidden = await sceneOf({ hideEndsM: 600 });
    const gone = await sceneOf({ hideEndsM: 2000 });

    expect(hidden.lines.flat().length).toBeLessThan(101);
    expect(gone.lines).toEqual([]);
  });
});

describe("drawSummaryCard", () => {
  it("draws the card background, the texts and the map", () => {
    const { ctx, calls } = canvasRecorder();
    const model = buildCardModel({ ride, watts }, "Morning ride.fit", options);
    const scene: MapScene = {
      box: CARD_MAP_BOX,
      lines: [
        [
          { x: 10, y: 10 },
          { x: 100, y: 100 },
        ],
      ],
      backdrop,
      attribution: "© Test maps",
    };

    drawSummaryCard(ctx, model, scene);

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
      "© Test maps",
    ]);
    expect(calls).toContainEqual([
      "drawImage",
      backdrop,
      0,
      0,
      CARD_MAP_BOX.width,
      CARD_MAP_BOX.height,
    ]);
    expect(calls.filter((c) => c[0] === "stroke").length).toBeGreaterThan(0);
  });

  it("keeps the map inside the right half of the card", () => {
    const { ctx, calls } = canvasRecorder();

    drawSummaryCard(ctx, { title: "t", dateText: "d", stats: [] }, noMap);

    expect(calls).toContainEqual([
      "rect",
      CARD_MAP_BOX.x,
      CARD_MAP_BOX.y,
      CARD_MAP_BOX.width,
      CARD_MAP_BOX.height,
    ]);
  });

  it("still has the card, with a plain panel for the map, when there is no route", () => {
    const { ctx, calls } = canvasRecorder();

    drawSummaryCard(ctx, { title: "t", dateText: "d", stats: [] }, noMap);

    expect(calls.filter((c) => c[0] === "stroke")).toHaveLength(0);
    expect(calls.filter((c) => c[0] === "drawImage")).toHaveLength(0);
    expect(calls).toContainEqual(["fillRect", 0, 0, CARD_MAP_BOX.width, CARD_MAP_BOX.height]);
  });
});
