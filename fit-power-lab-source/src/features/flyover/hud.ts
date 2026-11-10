import type { Translator } from "@/app/i18n";
import type { FlightFrame } from "@/domain/flyover/flightPath";
import {
  altitudeUnit,
  altitudeValue,
  distanceUnit,
  distanceValue,
  formatDuration,
  speedUnit,
  speedValue,
  type UnitSystem,
} from "@/lib/units";

export type Orientation = "vertical" | "horizontal";

/** Vertical for phones, horizontal for screens; both full HD. */
export const FRAME_SIZES: Record<Orientation, { width: number; height: number }> = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
};

export type HudKey =
  "speed" | "power" | "cadence" | "heartRate" | "grade" | "altitude" | "distance" | "time";

export interface HudTile {
  key: HudKey;
  label: string;
  value: string;
  unit: string;
  /** The speed and the power are drawn bigger than the rest. */
  primary: boolean;
}

export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TileOptions {
  units: UnitSystem;
  t: Translator;
}

/** "+4.2", "-3.0" and "0.0": a climb gets its plus sign and a flat road has no sign at all. */
function signedGrade(grade: number): string {
  const text = grade.toFixed(1);
  if (Number(text) === 0) return "0.0";
  return grade > 0 ? `+${text}` : text;
}

/**
 * What the overlay writes at a frame: the speed and the power first, then the other readings the
 * ride has, then the distance and the time. A reading the ride did not record is not shown.
 */
export function hudTiles(frame: FlightFrame, { units, t }: TileOptions): HudTile[] {
  const m = frame.metrics;
  const tiles: HudTile[] = [];
  const add = (key: HudKey, value: string, unit: string, primary = false) =>
    tiles.push({ key, label: t(`flyover.hud.${key}`), value, unit, primary });

  if (m.speed !== undefined) {
    add("speed", speedValue(m.speed, units).toFixed(1), speedUnit(units), true);
  }
  if (m.power !== undefined) add("power", String(Math.round(m.power)), "W", true);
  if (m.cadence !== undefined) {
    add("cadence", String(Math.round(m.cadence)), t("flyover.hud.cadenceUnit"));
  }
  if (m.heartRate !== undefined) {
    add("heartRate", String(Math.round(m.heartRate)), t("flyover.hud.heartRateUnit"));
  }
  if (m.grade !== undefined) add("grade", signedGrade(m.grade), "%");
  if (m.altitude !== undefined) {
    add("altitude", String(Math.round(altitudeValue(m.altitude, units))), altitudeUnit(units));
  }
  add("distance", distanceValue(frame.distanceM / 1000, units).toFixed(2), distanceUnit(units));
  add("time", formatDuration(frame.elapsedS), "");
  return tiles;
}

const MARGIN = { vertical: 32, horizontal: 40 };
const TOP = { vertical: 64, horizontal: 36 };
const PADDING = 24;
const GAP = 16;
const PRIMARY_HEIGHT = 220;
const SECONDARY_HEIGHT = 130;
const SECONDARY_COLUMNS = 3;
const ROW_HEIGHT_HORIZONTAL = 190;
const PRIMARY_WEIGHT = 1.7;

export interface HudLayout {
  panel: HudRect;
  tiles: (HudTile & { rect: HudRect })[];
}

/**
 * Where the tiles go. Upright, the speed and the power share the first row and the other readings
 * follow in rows of three; sideways, everything is on one row, the speed and the power wider.
 */
export function hudLayout(orientation: Orientation, tiles: HudTile[]): HudLayout {
  const size = FRAME_SIZES[orientation];
  const margin = MARGIN[orientation];
  const top = TOP[orientation];
  const innerX = margin + PADDING;
  const innerWidth = size.width - 2 * margin - 2 * PADDING;
  const placed: HudLayout["tiles"] = [];

  if (orientation === "horizontal") {
    const gaps = GAP * Math.max(0, tiles.length - 1);
    const weights = tiles.map((tile) => (tile.primary ? PRIMARY_WEIGHT : 1));
    const unit = (innerWidth - gaps) / weights.reduce((a, b) => a + b, 0);
    let x = innerX;
    tiles.forEach((tile, i) => {
      const width = unit * (weights[i] ?? 1);
      placed.push({
        ...tile,
        rect: { x, y: top + PADDING, width, height: ROW_HEIGHT_HORIZONTAL },
      });
      x += width + GAP;
    });
    return {
      panel: {
        x: margin,
        y: top,
        width: size.width - 2 * margin,
        height: ROW_HEIGHT_HORIZONTAL + 2 * PADDING,
      },
      tiles: placed,
    };
  }

  const primary = tiles.filter((tile) => tile.primary);
  const secondary = tiles.filter((tile) => !tile.primary);
  let y = top + PADDING;
  if (primary.length > 0) {
    const width = (innerWidth - GAP * (primary.length - 1)) / primary.length;
    primary.forEach((tile, i) =>
      placed.push({
        ...tile,
        rect: { x: innerX + i * (width + GAP), y, width, height: PRIMARY_HEIGHT },
      }),
    );
    y += PRIMARY_HEIGHT + GAP;
  }
  const width = (innerWidth - GAP * (SECONDARY_COLUMNS - 1)) / SECONDARY_COLUMNS;
  secondary.forEach((tile, i) => {
    const column = i % SECONDARY_COLUMNS;
    const row = Math.floor(i / SECONDARY_COLUMNS);
    placed.push({
      ...tile,
      rect: {
        x: innerX + column * (width + GAP),
        y: y + row * (SECONDARY_HEIGHT + GAP),
        width,
        height: SECONDARY_HEIGHT,
      },
    });
  });
  const rows = Math.ceil(secondary.length / SECONDARY_COLUMNS);
  const bottom = y + rows * (SECONDARY_HEIGHT + GAP) - (rows > 0 ? GAP : 0) + PADDING;
  return {
    panel: { x: margin, y: top, width: size.width - 2 * margin, height: bottom - top },
    tiles: placed,
  };
}

const PANEL = "rgba(15, 23, 42, 0.78)";
const TILE = "rgba(255, 255, 255, 0.07)";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const BAR = "#38bdf8";
const BAR_TRACK = "rgba(255, 255, 255, 0.2)";
const FOOTER = "rgba(15, 23, 42, 0.7)";
const BAR_HEIGHT = 10;
const FOOTER_HEIGHT = 92;
const FONT = "system-ui, sans-serif";

function roundedRect(ctx: CanvasRenderingContext2D, r: HudRect, radius: number): void {
  const x2 = r.x + r.width;
  const y2 = r.y + r.height;
  ctx.beginPath();
  ctx.moveTo(r.x + radius, r.y);
  ctx.arcTo(x2, r.y, x2, y2, radius);
  ctx.arcTo(x2, y2, r.x, y2, radius);
  ctx.arcTo(r.x, y2, r.x, r.y, radius);
  ctx.arcTo(r.x, r.y, x2, r.y, radius);
  ctx.closePath();
}

export interface HudFooter {
  title: string;
  dateText: string;
  /** Credit of the map and the terrain data; empty when there is nothing to credit. */
  credit: string;
}

/**
 * Draws the overlay over a frame: the readings in a panel at the top, and along the bottom the
 * title, the date, the credit of the map data and a bar with the progress of the video.
 */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  orientation: Orientation,
  tiles: HudTile[],
  footer: HudFooter,
  progress: number,
): void {
  const size = FRAME_SIZES[orientation];
  const layout = hudLayout(orientation, tiles);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.fillStyle = PANEL;
  roundedRect(ctx, layout.panel, 28);
  ctx.fill();

  for (const tile of layout.tiles) {
    const { rect } = tile;
    ctx.fillStyle = TILE;
    roundedRect(ctx, rect, 20);
    ctx.fill();

    const pad = rect.height * 0.12;
    // The label and the unit share a line: the letters shrink until both fit in a narrow tile.
    const labelRoom = rect.width - 2 * pad;
    const labelChars = tile.label.length + tile.unit.length + 1;
    const labelSize = Math.floor(
      Math.max(14, Math.min(Math.max(20, rect.height * 0.14), labelRoom / (labelChars * 0.56))),
    );
    ctx.font = `500 ${labelSize}px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(tile.label, rect.x + pad, rect.y + pad + labelSize * 0.8, rect.width - 2 * pad);

    const room = rect.width - 2 * pad;
    const valueSize = Math.round(
      Math.min(
        rect.height * (tile.primary ? 0.46 : 0.38),
        room / (Math.max(3, tile.value.length) * 0.62),
      ),
    );
    ctx.font = `700 ${valueSize}px ${FONT}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(tile.value, rect.x + pad, rect.y + rect.height - pad, room);

    if (tile.unit) {
      ctx.font = `500 ${labelSize}px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = "right";
      ctx.fillText(tile.unit, rect.x + rect.width - pad, rect.y + pad + labelSize * 0.8, room / 2);
      ctx.textAlign = "left";
    }
  }

  const margin = MARGIN[orientation];
  ctx.fillStyle = FOOTER;
  ctx.fillRect(0, size.height - FOOTER_HEIGHT, size.width, FOOTER_HEIGHT);
  ctx.font = `700 34px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText(footer.title, margin, size.height - BAR_HEIGHT - 44, size.width * 0.5);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(footer.dateText, margin, size.height - BAR_HEIGHT - 12, size.width * 0.5);
  if (footer.credit) {
    ctx.font = `400 20px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(
      footer.credit,
      size.width - margin,
      size.height - BAR_HEIGHT - 14,
      size.width * 0.45,
    );
    ctx.textAlign = "left";
  }

  const fraction = Math.max(0, Math.min(1, progress));
  ctx.fillStyle = BAR_TRACK;
  ctx.fillRect(0, size.height - BAR_HEIGHT, size.width, BAR_HEIGHT);
  ctx.fillStyle = BAR;
  ctx.fillRect(0, size.height - BAR_HEIGHT, size.width * fraction, BAR_HEIGHT);
}
