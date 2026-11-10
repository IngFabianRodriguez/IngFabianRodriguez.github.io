import { memo } from "react";
import { useI18n } from "@/app/I18nContext";
import type { KmRange } from "@/app/appState";
import type { RideSeries } from "@/domain/series";
import type { ChartModel } from "@/domain/viz/chartModel";
import { GRADE_BANDS } from "@/domain/viz/grade";
import { pickRows } from "@/domain/viz/tableRows";
import { ChartFrame } from "@/features/charts/ChartFrame";
import type { ChartTable } from "@/features/charts/ChartDataTable";
import { SeriesPlot } from "@/features/charts/SeriesPlot";
import { formatDuration } from "@/lib/units";

export const TABLE_ROWS = 50;

interface SeriesCardProps {
  series: RideSeries;
  model: ChartModel;
  /** Start of every downloaded file name. */
  fileBase: string;
  onCursorKm: (km: number | null) => void;
  onRange: (range: KmRange) => void;
}

function describe(series: RideSeries) {
  const values = series.points.map((p) => p.y);
  return {
    low: values.reduce((low, v) => Math.min(low, v), Infinity),
    high: values.reduce((high, v) => Math.max(high, v), -Infinity),
  };
}

/** One variable: its chart, summary of what is visible, grade legend for altitude, data table. */
function Card({ series, model, fileBase, onCursorKm, onRange }: SeriesCardProps) {
  const { t } = useI18n();
  const title = t(`charts.series.${series.key}`);
  const axis = model.spec.axis;
  const { low, high } = describe(series);
  const stats = model.stats[series.key];
  const byGrade = series.key === "altitude" && model.profile.length > 1;

  const xHeader =
    axis === "time"
      ? t("charts.data.colTime")
      : t("charts.data.colDistance", { unit: model.xUnit });
  const tableX = (x: number) => (axis === "time" ? formatDuration(x * 60) : x.toFixed(3));
  const buildTable = (): ChartTable => {
    const unitHeader = `${title} (${series.unit})`;
    if (byGrade) {
      const picked = pickRows(model.profile, TABLE_ROWS);
      return {
        columns: [xHeader, unitHeader, t("charts.data.colGrade")],
        rows: picked.rows.map((p) => [tableX(p.x), p.y, p.grade]),
        total: picked.total,
      };
    }
    const picked = pickRows(series.points, TABLE_ROWS);
    return {
      columns: [xHeader, unitHeader],
      rows: picked.rows.map((p) => [tableX(p.x), p.y]),
      total: picked.total,
    };
  };

  return (
    <ChartFrame
      title={title}
      description={series.unit}
      downloadName={`${fileBase}-${series.key}`}
      buildTable={buildTable}
      footer={
        <>
          {stats ? (
            <p className="text-muted-foreground text-xs">
              {t("charts.stats", { ...stats, unit: series.unit })}
            </p>
          ) : null}
          {byGrade ? (
            <ul
              aria-label={t("charts.grade.title")}
              className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs"
            >
              {GRADE_BANDS.map((band, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 rounded-sm"
                    style={{ backgroundColor: band.color }}
                  />
                  {t(`charts.grade.band.${i}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      }
    >
      <SeriesPlot
        seriesKey={series.key}
        label={title}
        unit={series.unit}
        points={series.points}
        profile={byGrade ? model.profile : undefined}
        model={model}
        ariaLabel={t("charts.describe", {
          label: title,
          unit: series.unit,
          axis: t(`charts.axis.${axis}`),
          low,
          high,
        })}
        onCursorKm={onCursorKm}
        onRange={onRange}
      />
    </ChartFrame>
  );
}

export const SeriesCard = memo(Card);
