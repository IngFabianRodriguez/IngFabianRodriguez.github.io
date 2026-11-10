import type { Translator } from "@/app/i18n";
import type { Analysis } from "@/domain/analysis";
import type { Locale } from "@/app/i18n";
import { drawMapScene } from "@/features/share/mapPaint";
import {
  buildMapScene,
  type MapBox,
  type MapScene,
  type TileLoader,
} from "@/features/share/mapScene";
import { rideTitle, summarize } from "@/features/share/summary";
import type { TileConfig } from "@/lib/tiles";
import { formatDistance, formatDuration, type UnitSystem } from "@/lib/units";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
/** Where the map goes on the card: the right half, with the same margin on every side. */
export const CARD_MAP_BOX: MapBox = { x: 620, y: 40, width: 540, height: 550 };

export interface CardModel {
  title: string;
  dateText: string;
  stats: { label: string; value: string }[];
}

interface CardOptions {
  units: UnitSystem;
  locale: Locale;
  t: Translator;
  hideEndsM: number;
}

/** What the card says: the title, the date, and distance, time and average power. */
export function buildCardModel(
  analysis: Pick<Analysis, "ride" | "watts">,
  fileName: string,
  { units, locale, t }: CardOptions,
): CardModel {
  const figures = summarize(analysis.ride, analysis.watts);
  return {
    title: rideTitle(fileName),
    dateText: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
      analysis.ride.startTime,
    ),
    stats: [
      { label: t("share.card.distance"), value: formatDistance(figures.distanceKm, units, 1) },
      { label: t("share.card.time"), value: formatDuration(figures.elapsedS) },
      { label: t("share.card.power"), value: `${figures.avgPowerW} W` },
    ],
  };
}

interface CardSceneOptions {
  hideEndsM: number;
  tiles: TileConfig;
  loadTile: TileLoader;
  createCanvas?: () => HTMLCanvasElement;
}

/** The map of the card: the tiles behind the route, without the hidden ends. */
export function buildCardScene(
  analysis: Pick<Analysis, "ride">,
  options: CardSceneOptions,
): Promise<MapScene> {
  return buildMapScene(analysis.ride, { ...options, box: CARD_MAP_BOX, padding: 40 });
}

const BACKGROUND = "#0f172a";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";

/** Draws the summary card: a dark card with the map on its right, readable whatever the theme. */
export function drawSummaryCard(
  ctx: CanvasRenderingContext2D,
  model: CardModel,
  map: MapScene,
): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXT;
  ctx.font = "700 54px system-ui, sans-serif";
  ctx.fillText(model.title, 60, 130, 520);
  ctx.fillStyle = MUTED;
  ctx.font = "400 28px system-ui, sans-serif";
  ctx.fillText(model.dateText, 60, 178, 520);

  model.stats.forEach((stat, index) => {
    const y = 290 + index * 115;
    ctx.fillStyle = MUTED;
    ctx.font = "400 24px system-ui, sans-serif";
    ctx.fillText(stat.label, 60, y, 520);
    ctx.fillStyle = TEXT;
    ctx.font = "700 52px system-ui, sans-serif";
    ctx.fillText(stat.value, 60, y + 56, 520);
  });

  drawMapScene(ctx, map);
}
