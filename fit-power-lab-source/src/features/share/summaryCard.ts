import type { Translator } from "@/app/i18n";
import type { Analysis } from "@/domain/analysis";
import type { Locale } from "@/app/i18n";
import { miniRoute, type Pt } from "@/domain/viz/miniRoute";
import { rideTitle, summarize } from "@/features/share/summary";
import { formatDistance, formatDuration, type UnitSystem } from "@/lib/units";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const ROUTE_BOX = { x: 700, y: 105, size: 420 };

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

/** The route as lines inside the box of the card, without the hidden ends. */
export function cardRoute(analysis: Pick<Analysis, "ride">, hideEndsM: number): Pt[][] {
  return miniRoute(analysis.ride, {
    width: ROUTE_BOX.size,
    height: ROUTE_BOX.size,
    padding: 20,
    hideEndsM,
  });
}

const BACKGROUND = "#0f172a";
const TEXT = "#f8fafc";
const MUTED = "#94a3b8";
const ROUTE = "#38bdf8";

/** Draws the summary card: a dark card, readable whatever the theme of the page. */
export function drawSummaryCard(
  ctx: CanvasRenderingContext2D,
  model: CardModel,
  route: Pt[][],
): void {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TEXT;
  ctx.font = "700 54px system-ui, sans-serif";
  ctx.fillText(model.title, 60, 130, 600);
  ctx.fillStyle = MUTED;
  ctx.font = "400 28px system-ui, sans-serif";
  ctx.fillText(model.dateText, 60, 178, 600);

  model.stats.forEach((stat, index) => {
    const y = 290 + index * 115;
    ctx.fillStyle = MUTED;
    ctx.font = "400 24px system-ui, sans-serif";
    ctx.fillText(stat.label, 60, y, 560);
    ctx.fillStyle = TEXT;
    ctx.font = "700 52px system-ui, sans-serif";
    ctx.fillText(stat.value, 60, y + 56, 560);
  });

  ctx.strokeStyle = ROUTE;
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const segment of route) {
    ctx.beginPath();
    segment.forEach((p, i) => {
      const x = ROUTE_BOX.x + p.x;
      const y = ROUTE_BOX.y + p.y;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}
