import { describe, expect, it } from "vitest";
import { createTranslator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";
import type { FlightFrame } from "@/domain/flyover/flightPath";
import {
  drawHud,
  FRAME_SIZES,
  hudLayout,
  hudTiles,
  type Orientation,
} from "@/features/flyover/hud";
import { canvasRecorder } from "@/test/canvasRecorder";

const t = createTranslator(MESSAGES, "en");
const tEs = createTranslator(MESSAGES, "es");

const frame: FlightFrame = {
  fraction: 0.5,
  lat: 4.7,
  lon: -30.1,
  bearingRad: 0,
  distanceM: 1234,
  elapsedS: 100,
  metrics: {
    speed: 36,
    power: 215.4,
    cadence: 88.2,
    heartRate: 151.6,
    grade: 4.24,
    altitude: 2450.4,
    temperature: 15,
  },
};

describe("hudTiles", () => {
  it("has the speed and the power first and big, then the rest of the readings", () => {
    const tiles = hudTiles(frame, { units: "metric", t });

    expect(tiles.map((tile) => tile.key)).toEqual([
      "speed",
      "power",
      "cadence",
      "heartRate",
      "grade",
      "altitude",
      "distance",
      "time",
    ]);
    expect(tiles.filter((tile) => tile.primary).map((tile) => tile.key)).toEqual([
      "speed",
      "power",
    ]);
  });

  it("writes each reading with its label, value and unit", () => {
    const tiles = hudTiles(frame, { units: "metric", t });
    const by = Object.fromEntries(tiles.map((tile) => [tile.key, tile]));

    expect(by["speed"]).toMatchObject({ label: "Speed", value: "36.0", unit: "km/h" });
    expect(by["power"]).toMatchObject({ label: "Power (est.)", value: "215", unit: "W" });
    expect(by["cadence"]).toMatchObject({ value: "88", unit: "rpm" });
    expect(by["heartRate"]).toMatchObject({ value: "152", unit: "bpm" });
    expect(by["grade"]).toMatchObject({ value: "+4.2", unit: "%" });
    expect(by["altitude"]).toMatchObject({ value: "2450", unit: "m" });
    expect(by["distance"]).toMatchObject({ label: "Distance", value: "1.23", unit: "km" });
    expect(by["time"]).toMatchObject({ label: "Time", value: "1:40", unit: "" });
  });

  it("writes a descent with its minus sign and a flat road without a sign", () => {
    const grade = (value: number) =>
      hudTiles(
        { ...frame, metrics: { ...frame.metrics, grade: value } },
        { units: "metric", t },
      ).find((tile) => tile.key === "grade")?.value;

    expect(grade(-3.04)).toBe("-3.0");
    expect(grade(0.02)).toBe("0.0");
  });

  it("uses miles, miles per hour and feet in imperial units", () => {
    const by = Object.fromEntries(
      hudTiles(frame, { units: "imperial", t }).map((tile) => [tile.key, tile]),
    );

    expect(by["speed"]).toMatchObject({ value: "22.4", unit: "mph" });
    expect(by["distance"]).toMatchObject({ value: "0.77", unit: "mi" });
    expect(by["altitude"]).toMatchObject({ value: "8039", unit: "ft" });
  });

  it("leaves out what the ride did not record", () => {
    const bare: FlightFrame = { ...frame, metrics: { speed: 36 } };

    expect(hudTiles(bare, { units: "metric", t }).map((tile) => tile.key)).toEqual([
      "speed",
      "distance",
      "time",
    ]);
  });

  it("speaks Spanish when asked to", () => {
    const tiles = hudTiles(frame, { units: "metric", t: tEs });

    expect(tiles.find((tile) => tile.key === "speed")?.label).toBe("Velocidad");
    expect(tiles.find((tile) => tile.key === "heartRate")?.unit).toBe("lpm");
  });
});

describe("hudLayout", () => {
  const tiles = hudTiles(frame, { units: "metric", t });

  it.each<Orientation>(["vertical", "horizontal"])(
    "fits every tile inside the panel and the panel inside the %s frame, with no overlaps",
    (orientation) => {
      const size = FRAME_SIZES[orientation];
      const layout = hudLayout(orientation, tiles);

      expect(layout.tiles).toHaveLength(tiles.length);
      expect(layout.panel.x).toBeGreaterThanOrEqual(0);
      expect(layout.panel.y).toBeGreaterThanOrEqual(0);
      expect(layout.panel.x + layout.panel.width).toBeLessThanOrEqual(size.width);
      expect(layout.panel.y + layout.panel.height).toBeLessThanOrEqual(size.height);
      for (const tile of layout.tiles) {
        expect(tile.rect.x).toBeGreaterThanOrEqual(layout.panel.x);
        expect(tile.rect.y).toBeGreaterThanOrEqual(layout.panel.y);
        expect(tile.rect.x + tile.rect.width).toBeLessThanOrEqual(
          layout.panel.x + layout.panel.width,
        );
        expect(tile.rect.y + tile.rect.height).toBeLessThanOrEqual(
          layout.panel.y + layout.panel.height,
        );
      }
      for (const [i, a] of layout.tiles.entries()) {
        for (const b of layout.tiles.slice(i + 1)) {
          const apart =
            a.rect.x + a.rect.width <= b.rect.x ||
            b.rect.x + b.rect.width <= a.rect.x ||
            a.rect.y + a.rect.height <= b.rect.y ||
            b.rect.y + b.rect.height <= a.rect.y;
          expect(apart).toBe(true);
        }
      }
    },
  );

  it("leaves most of the picture to the map", () => {
    expect(hudLayout("vertical", tiles).panel.height).toBeLessThan(
      FRAME_SIZES.vertical.height * 0.35,
    );
    expect(hudLayout("horizontal", tiles).panel.height).toBeLessThan(
      FRAME_SIZES.horizontal.height * 0.3,
    );
  });

  it("makes the speed and the power larger than the other readings", () => {
    for (const orientation of ["vertical", "horizontal"] as const) {
      const layout = hudLayout(orientation, tiles);
      const primary = layout.tiles.filter((tile) => tile.primary);
      const secondary = layout.tiles.filter((tile) => !tile.primary);

      expect(
        Math.min(...primary.map((tile) => tile.rect.width * tile.rect.height)),
      ).toBeGreaterThan(Math.max(...secondary.map((tile) => tile.rect.width * tile.rect.height)));
    }
  });

  it("lays out as many tiles as there are readings, also when there are few", () => {
    const few = hudTiles({ ...frame, metrics: { speed: 36 } }, { units: "metric", t });

    for (const orientation of ["vertical", "horizontal"] as const) {
      expect(hudLayout(orientation, few).tiles).toHaveLength(3);
    }
  });

  it("has frames of 1080 x 1920 upright and 1920 x 1080 sideways", () => {
    expect(FRAME_SIZES).toEqual({
      vertical: { width: 1080, height: 1920 },
      horizontal: { width: 1920, height: 1080 },
    });
  });
});

describe("drawHud letter size", () => {
  const footer = { title: "t", dateText: "d", credit: "" };

  /** Size in pixels of the font used to write a text, from the recorded calls. */
  function fontOf(calls: [string, ...unknown[]][], text: string): number {
    const at = calls.findIndex((c) => c[0] === "fillText" && c[1] === text);
    const font = calls
      .slice(0, at)
      .filter((c) => c[0] === "set font")
      .at(-1)?.[1] as string;
    return Number(/(\d+)px/.exec(font)?.[1]);
  }

  it("shrinks the label and the unit of a narrow tile so that they do not overlap", () => {
    const tiles = hudTiles(frame, { units: "metric", t });
    const { ctx, calls } = canvasRecorder();

    drawHud(ctx, "horizontal", tiles, footer, 0);

    const layout = hudLayout("horizontal", tiles);
    for (const tile of layout.tiles) {
      const size = fontOf(calls, tile.label);
      const room = tile.rect.width - 2 * tile.rect.height * 0.12;
      // About 0.56 of its size for each character, label, a space and unit on one line.
      expect(size * 0.56 * (tile.label.length + tile.unit.length + 1)).toBeLessThanOrEqual(
        room + 1,
      );
    }
  });

  it("keeps the larger letters where there is room", () => {
    const tiles = hudTiles(frame, { units: "metric", t });
    const { ctx, calls } = canvasRecorder();

    drawHud(ctx, "vertical", tiles, footer, 0);

    expect(fontOf(calls, "Speed")).toBeGreaterThanOrEqual(26);
  });
});

describe("drawHud", () => {
  const footer = { title: "Morning ride", dateText: "February 25, 2024", credit: "© Maps" };
  const tiles = hudTiles(frame, { units: "metric", t });

  it("writes every label and value, then the title, the date and the credit", () => {
    const { ctx, calls } = canvasRecorder();

    drawHud(ctx, "vertical", tiles, footer, 0.5);

    const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    for (const tile of tiles) {
      expect(texts).toContain(tile.label);
      expect(texts).toContain(tile.value);
    }
    expect(texts).toEqual(expect.arrayContaining(["Morning ride", "February 25, 2024", "© Maps"]));
  });

  it("draws the progress of the video as a bar along the bottom edge", () => {
    for (const orientation of ["vertical", "horizontal"] as const) {
      const size = FRAME_SIZES[orientation];
      const barWidths = (fraction: number) => {
        const { ctx, calls } = canvasRecorder();
        drawHud(ctx, orientation, tiles, footer, fraction);
        return calls
          .filter((c) => c[0] === "fillRect" && (c[2] as number) + (c[4] as number) === size.height)
          .map((c) => c[3]);
      };

      expect(barWidths(0.25)).toContain(size.width / 4);
      expect(barWidths(1)).toContain(size.width);
    }
  });

  it("draws no credit when there is none", () => {
    const { ctx, calls } = canvasRecorder();

    drawHud(ctx, "horizontal", tiles, { ...footer, credit: "" }, 0);

    const texts = calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(texts).not.toContain("");
  });
});
