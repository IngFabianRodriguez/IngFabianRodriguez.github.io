import { useMemo } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import type { Analysis } from "@/domain/analysis";
import { buildSeries, type SeriesKey } from "@/domain/series";
import { miniRoute, sparkline } from "@/domain/viz/miniRoute";
import { rideTitle, summarize } from "@/features/share/summary";
import { SERIES_COLORS } from "@/features/charts/palette";
import { formatAltitude, formatDistance, formatDuration, formatSpeed } from "@/lib/units";

interface ReportViewProps {
  analysis: Pick<Analysis, "ride" | "watts">;
  fileName: string;
}

const REPORT_CHARTS: SeriesKey[] = ["speed", "power", "heartRate", "altitude"];
const ROUTE_BOX = { width: 320, height: 240, padding: 12 };
const CHART_BOX = { width: 320, height: 90, padding: 6 };

/**
 * A report of the ride laid out to be printed: title and date, key numbers, an outline of the
 * route (without the hidden ends) and a small chart for each main variable. On screen it is a
 * preview; Tailwind `print:` variants make it black on white and keep each block on one page.
 */
export function ReportView({ analysis, fileName }: ReportViewProps) {
  const { t, locale } = useI18n();
  const { units, mapPrivacy } = useAppState();
  const { ride, watts } = analysis;

  const figures = useMemo(() => summarize(ride, watts), [ride, watts]);
  const route = useMemo(
    () => miniRoute(ride, { ...ROUTE_BOX, hideEndsM: mapPrivacy.hideEndsM }),
    [ride, mapPrivacy.hideEndsM],
  );
  const charts = useMemo(
    () =>
      buildSeries(ride, watts, 160, { units }).available.filter((s) =>
        REPORT_CHARTS.includes(s.key),
      ),
    [ride, watts, units],
  );

  const stats: { label: string; value: string }[] = [
    { label: t("share.stat.distance"), value: formatDistance(figures.distanceKm, units, 1) },
    { label: t("share.stat.elapsed"), value: formatDuration(figures.elapsedS) },
    { label: t("share.stat.avgSpeed"), value: formatSpeed(figures.avgSpeedKmh, units, 1) },
    { label: t("share.stat.maxSpeed"), value: formatSpeed(figures.maxSpeedKmh, units, 1) },
    { label: t("share.stat.avgPower"), value: `${figures.avgPowerW} W` },
    { label: t("share.stat.maxPower"), value: `${figures.maxPowerW} W` },
    ...(figures.avgHeartRate !== undefined
      ? [{ label: t("share.stat.avgHeartRate"), value: `${figures.avgHeartRate} bpm` }]
      : []),
    ...(figures.avgCadence !== undefined
      ? [{ label: t("share.stat.avgCadence"), value: `${figures.avgCadence} rpm` }]
      : []),
    {
      label: t("share.stat.altitude"),
      value: `${formatAltitude(figures.altitudeMin, units)} - ${formatAltitude(figures.altitudeMax, units)}`,
    },
    { label: t("share.stat.stops"), value: String(figures.stops) },
  ];

  return (
    <article className="bg-card text-card-foreground grid gap-6 rounded-xl border p-6 print:gap-4 print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
      <header className="grid gap-1 print:break-inside-avoid">
        <p className="text-muted-foreground text-sm print:text-gray-600">
          {t("share.report.title")}
        </p>
        <h1 className="text-2xl font-semibold">{rideTitle(fileName)}</h1>
        <p className="text-muted-foreground text-sm print:text-gray-600">
          {new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(
            ride.startTime,
          )}
        </p>
      </header>

      <section aria-labelledby="report-numbers" className="grid gap-2 print:break-inside-avoid">
        <h2 id="report-numbers" className="text-lg font-medium">
          {t("share.report.keyNumbers")}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 print:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="grid">
              <dt className="text-muted-foreground text-xs print:text-gray-600">{stat.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="report-route" className="grid gap-2 print:break-inside-avoid">
        <h2 id="report-route" className="text-lg font-medium">
          {t("share.report.route")}
        </h2>
        {route.length > 0 ? (
          <svg
            role="img"
            aria-label={t("share.report.routeLabel")}
            viewBox={`0 0 ${ROUTE_BOX.width} ${ROUTE_BOX.height}`}
            className="h-auto w-full max-w-sm rounded-md border print:border-gray-300"
          >
            {route.map((segment, i) => (
              <polyline
                key={i}
                points={segment.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </svg>
        ) : (
          <p className="text-muted-foreground text-sm print:text-gray-600">
            {t("share.report.noRoute")}
          </p>
        )}
      </section>

      <section aria-labelledby="report-charts" className="grid gap-3">
        <h2 id="report-charts" className="text-lg font-medium">
          {t("share.report.charts")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {charts.map((series) => {
            const label = t(`charts.series.${series.key}`);
            const values = series.points.map((p) => p.y);
            const low = Math.min(...values);
            const high = Math.max(...values);
            const points = sparkline(series.points, CHART_BOX);
            return (
              <figure key={series.key} className="grid gap-1 print:break-inside-avoid">
                <svg
                  role="img"
                  aria-label={t("share.report.chartLabel", {
                    label,
                    unit: series.unit,
                    low,
                    high,
                  })}
                  viewBox={`0 0 ${CHART_BOX.width} ${CHART_BOX.height}`}
                  className="h-auto w-full rounded-md border print:border-gray-300"
                >
                  <polyline
                    points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                    fill="none"
                    stroke={SERIES_COLORS[series.key].light}
                    strokeWidth="1.5"
                  />
                </svg>
                <figcaption className="text-muted-foreground text-xs print:text-gray-600">
                  {t("share.report.chartCaption", { label, unit: series.unit, low, high })}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      <footer className="text-muted-foreground text-xs print:break-inside-avoid print:text-gray-600">
        {t("share.report.footer")}
      </footer>
    </article>
  );
}
