import { memo, useId } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  usePlotArea,
  XAxis,
  YAxis,
} from "recharts";
import type { KmRange } from "@/app/appState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { SeriesKey } from "@/domain/series";
import { formatTick } from "@/domain/viz/axis";
import type { ChartModel, ProfilePoint } from "@/domain/viz/chartModel";
import { gradeStops } from "@/domain/viz/grade";
import { CursorLine } from "@/features/charts/CursorLine";
import { SERIES_COLORS } from "@/features/charts/palette";
import { StopMarks } from "@/features/charts/StopMarks";
import { useChartInteractions } from "@/features/charts/useChartInteractions";
import { formatDuration } from "@/lib/units";

interface SeriesPlotProps {
  seriesKey: SeriesKey;
  label: string;
  unit: string;
  points: { x: number; y: number }[];
  /** Altitude with its grade: when given, the line is colored by grade. */
  profile?: ProfilePoint[] | undefined;
  model: ChartModel;
  ariaLabel: string;
  onCursorKm: (km: number | null) => void;
  onRange: (range: KmRange) => void;
}

/** The label of a horizontal value: `2.50 km`, or elapsed time. */
export function formatX(x: number, model: ChartModel): string {
  return model.spec.axis === "time" ? formatDuration(x * 60) : `${x.toFixed(2)} ${model.xUnit}`;
}

/**
 * Colors the line by grade. The gradient is laid out in plot coordinates so that a perfectly flat
 * line, which has no height for a relative gradient to use, is still painted.
 */
function GradeGradient({
  id,
  profile,
  domain,
}: {
  id: string;
  profile: ProfilePoint[];
  domain: [number, number];
}) {
  const plot = usePlotArea();
  const first = profile[0];
  const last = profile[profile.length - 1];
  if (!first || !last) return null;

  const span = domain[1] - domain[0];
  const place = (x: number) =>
    plot && span > 0 ? plot.x + (plot.width * (x - domain[0])) / span : undefined;
  const x1 = place(first.x);
  const x2 = place(last.x);
  const absolute = x1 !== undefined && x2 !== undefined && x2 > x1;

  return (
    <defs>
      <linearGradient
        id={id}
        {...(absolute ? { gradientUnits: "userSpaceOnUse", x1, x2, y1: 0, y2: 0 } : {})}
      >
        {gradeStops(profile).map((stop, i) => (
          <stop key={i} offset={stop.offset} stopColor={stop.color} />
        ))}
      </linearGradient>
    </defs>
  );
}

function PlotInner({
  seriesKey,
  label,
  unit,
  points,
  profile,
  model,
  ariaLabel,
  onCursorKm,
  onRange,
}: SeriesPlotProps) {
  const gradientId = `grade-${useId().replace(/:/g, "")}`;
  const colors = SERIES_COLORS[seriesKey];
  const config: ChartConfig = { y: { label, theme: colors } };
  const { handlers, selection } = useChartInteractions({
    points,
    axisMap: model.axisMap,
    onCursorKm,
    onRange,
  });
  const colored = profile !== undefined && profile.length > 1;
  const stroke = colored ? `url(#${gradientId})` : "var(--color-y)";
  const axis = model.spec.axis;

  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={ariaLabel}
      className="aspect-auto h-48 w-full select-none"
    >
      <ComposedChart
        data={colored ? profile : points}
        margin={{ left: 4, right: 12, top: 4 }}
        {...handlers}
      >
        {colored ? <GradeGradient id={gradientId} profile={profile} domain={model.domain} /> : null}
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
        <YAxis width={48} domain={["auto", "auto"]} tickMargin={4} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_label, payload) => {
                const x: unknown = payload?.[0]?.payload?.x;
                return typeof x === "number" ? formatX(x, model) : "";
              }}
              formatter={(value, _name, item) => {
                const grade: unknown = item?.payload?.grade;
                const extra = typeof grade === "number" ? ` · ${grade} %` : "";
                return `${value} ${unit}${extra}`;
              }}
            />
          }
        />
        <StopMarks stops={model.stops} />
        {colored ? (
          <Area
            dataKey="y"
            type="linear"
            stroke="none"
            fill={stroke}
            fillOpacity={0.22}
            isAnimationActive={false}
            tooltipType="none"
          />
        ) : null}
        <Line
          dataKey="y"
          type="linear"
          stroke={stroke}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        {selection ? (
          <ReferenceArea
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
  );
}

/**
 * A line chart of one variable on the horizontal axis every chart of the ride shares. The pointer
 * sets the shared cursor and dragging selects a range. Memoized: it redraws only when its own
 * data changes, not when the cursor does (the cursor line is its own component).
 */
export const SeriesPlot = memo(PlotInner);
