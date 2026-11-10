import { memo, useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceArea, XAxis, YAxis } from "recharts";
import { useI18n } from "@/app/I18nContext";
import type { KmRange } from "@/app/appState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Ride } from "@/domain/ride";
import type { SeriesKey } from "@/domain/series";
import { formatTick } from "@/domain/viz/axis";
import type { ChartModel } from "@/domain/viz/chartModel";
import { combinedRows, planAxes, type CombinedRow } from "@/domain/viz/combined";
import { pickRows } from "@/domain/viz/tableRows";
import { ChartFrame } from "@/features/charts/ChartFrame";
import type { ChartTable } from "@/features/charts/ChartDataTable";
import { CursorLine } from "@/features/charts/CursorLine";
import { dashFor, SERIES_COLORS } from "@/features/charts/palette";
import { formatX } from "@/features/charts/SeriesPlot";
import { StopMarks } from "@/features/charts/StopMarks";
import { useChartInteractions } from "@/features/charts/useChartInteractions";
import { formatDuration } from "@/lib/units";

interface CombinedChartProps {
  ride: Ride;
  watts: number[];
  model: ChartModel;
  fileBase: string;
  onCursorKm: (km: number | null) => void;
  onRange: (range: KmRange) => void;
}

const DEFAULT_PICK: SeriesKey[] = ["power", "heartRate", "altitude"];

/**
 * Several variables on one chart, picked by the user. Where each goes (see `planAxes`): the first
 * unit gets the left axis, the second the right axis, and a variable of any further unit is drawn
 * from 0 to 100 over its own range with no axis, keeping its real values in tooltip and legend.
 */
function Combined({ ride, watts, model, fileBase, onCursorKm, onRange }: CombinedChartProps) {
  const { t } = useI18n();
  const available = useMemo(() => model.series.map((s) => s.key), [model.series]);
  const [picked, setPicked] = useState<SeriesKey[]>(() => {
    const chosen = DEFAULT_PICK.filter((key) => available.includes(key));
    return chosen.length > 0 ? chosen : available.slice(0, 2);
  });
  const units = model.spec.units;
  const axis = model.spec.axis;

  const plans = useMemo(() => planAxes(picked, units), [picked, units]);
  const rows = useMemo(
    () => combinedRows(ride, watts, picked, { units, xAxis: axis, domain: model.domain }),
    [ride, watts, picked, units, axis, model.domain],
  );
  const { handlers, selection } = useChartInteractions({
    points: rows,
    axisMap: model.axisMap,
    onCursorKm,
    onRange,
  });

  const label = (key: SeriesKey) => t(`charts.series.${key}`);
  const left = plans.filter((p) => p.placement === "left");
  const right = plans.filter((p) => p.placement === "right");
  const config: ChartConfig = Object.fromEntries(
    plans.map((p) => [p.key, { label: label(p.key), theme: SERIES_COLORS[p.key] }]),
  );

  const ranges = useMemo(() => {
    const found = new Map<SeriesKey, { min: number; max: number }>();
    for (const plan of plans) {
      if (plan.placement !== "normalized") continue;
      const values = rows
        .map((row) => row[`r_${plan.key}`])
        .filter((v): v is number => v !== undefined);
      if (values.length > 0)
        found.set(plan.key, { min: Math.min(...values), max: Math.max(...values) });
    }
    return found;
  }, [plans, rows]);

  const unitOf = (key: SeriesKey) => plans.find((p) => p.key === key)?.unit ?? "";
  const buildTable = (): ChartTable => {
    const keys = plans.map((p) => p.key);
    const chosen = pickRows(rows, 50);
    const x = (v: number) => (axis === "time" ? formatDuration(v * 60) : v.toFixed(3));
    return {
      columns: [
        axis === "time"
          ? t("charts.data.colTime")
          : t("charts.data.colDistance", { unit: model.xUnit }),
        ...keys.map((key) => `${label(key)} (${unitOf(key)})`),
      ],
      rows: chosen.rows.map((row: CombinedRow) => [
        x(row.x),
        ...keys.map((key) => row[`r_${key}`] ?? ""),
      ]),
      total: chosen.total,
    };
  };

  const axisText = (side: typeof left) => side.map((p) => `${label(p.key)} (${p.unit})`).join(", ");
  const title = t("charts.combined.title");
  const ariaLabel = t("charts.combined.describe", {
    list: plans.map((p) => label(p.key)).join(", "),
    axis: t(`charts.axis.${axis}`),
  });

  return (
    <ChartFrame
      title={title}
      description={t("charts.combined.description")}
      downloadName={`${fileBase}-combined`}
      buildTable={buildTable}
      footer={
        <div className="grid gap-2">
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            value={picked}
            onValueChange={(value) => setPicked(value as SeriesKey[])}
            aria-label={t("charts.combined.pick")}
            className="flex-wrap"
          >
            {available.map((key) => (
              <ToggleGroupItem key={key} value={key}>
                {label(key)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {plans.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t("charts.combined.empty")}</p>
          ) : (
            <>
              <p className="text-muted-foreground text-xs">
                {right.length > 0
                  ? t("charts.combined.axes", { left: axisText(left), right: axisText(right) })
                  : t("charts.combined.axesLeftOnly", { left: axisText(left) })}
              </p>
              <ul className="text-muted-foreground grid gap-1 text-xs">
                {plans.map((plan, index) => {
                  const own = ranges.get(plan.key);
                  return (
                    <li key={plan.key} className="flex items-center gap-2">
                      <svg width="28" height="8" aria-hidden="true">
                        <line
                          x1="0"
                          x2="28"
                          y1="4"
                          y2="4"
                          stroke={SERIES_COLORS[plan.key].light}
                          strokeWidth="2"
                          strokeDasharray={dashFor(index)}
                        />
                      </svg>
                      {plan.placement === "normalized" && own
                        ? t("charts.combined.ownScale", {
                            label: label(plan.key),
                            unit: plan.unit,
                            min: own.min,
                            max: own.max,
                          })
                        : `${label(plan.key)} (${plan.unit})`}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      }
    >
      <ChartContainer
        config={config}
        role="img"
        aria-label={ariaLabel}
        className="aspect-auto h-64 w-full select-none"
      >
        <ComposedChart data={rows} margin={{ left: 4, right: 4, top: 4 }} {...handlers}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={model.domain}
            ticks={model.ticks}
            allowDataOverflow
            interval={0}
            tickFormatter={(x: number) =>
              axis === "time"
                ? formatTick(x, model.tickStep, axis)
                : `${formatTick(x, model.tickStep, axis)} ${model.xUnit}`
            }
            tickMargin={6}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            width={48}
            domain={["auto", "auto"]}
            hide={left.length === 0}
            {...(left[0] ? { stroke: SERIES_COLORS[left[0].key].light } : {})}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            width={48}
            domain={["auto", "auto"]}
            hide={right.length === 0}
            {...(right[0] ? { stroke: SERIES_COLORS[right[0].key].light } : {})}
          />
          <YAxis yAxisId="own" hide domain={[0, 100]} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_l, payload) => {
                  const x: unknown = payload?.[0]?.payload?.x;
                  return typeof x === "number" ? formatX(x, model) : "";
                }}
                formatter={(_value, name, item) => {
                  const key = String(name).replace(/^p_/, "") as SeriesKey;
                  const real: unknown = item?.payload?.[`r_${key}`];
                  return `${label(key)}: ${typeof real === "number" ? real : ""} ${unitOf(key)}`;
                }}
              />
            }
          />
          <StopMarks stops={model.stops} />
          {plans.map((plan, index) => (
            <Line
              key={plan.key}
              yAxisId={plan.placement === "normalized" ? "own" : plan.placement}
              dataKey={`p_${plan.key}`}
              name={`p_${plan.key}`}
              type="linear"
              stroke={`var(--color-${plan.key})`}
              strokeWidth={2}
              strokeDasharray={dashFor(index)}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {selection ? (
            <ReferenceArea
              yAxisId="left"
              x1={selection.x1}
              x2={selection.x2}
              fill="var(--primary)"
              fillOpacity={0.15}
              stroke="var(--primary)"
            />
          ) : null}
          <CursorLine axisMap={model.axisMap} domain={model.domain} />
        </ComposedChart>
      </ChartContainer>
    </ChartFrame>
  );
}

export const CombinedChart = memo(Combined);
