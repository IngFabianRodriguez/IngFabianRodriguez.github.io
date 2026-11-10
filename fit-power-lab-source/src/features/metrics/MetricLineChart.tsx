import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface LineSeries {
  /** Key of the value in each data row. */
  key: string;
  label: string;
  color: string;
}

interface MetricLineChartProps {
  data: Record<string, string | number>[];
  /** Key of the category (the horizontal axis) in each data row. */
  xKey: string;
  series: LineSeries[];
  /** The text alternative of the chart: what it shows and its values. */
  ariaLabel: string;
}

/** One or more lines over a category axis (the power curve, the training load). */
export function MetricLineChart({ data, xKey, series, ariaLabel }: MetricLineChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  );

  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={ariaLabel}
      className="aspect-auto h-48 w-full"
    >
      <LineChart data={data} margin={{ left: 4, right: 12, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={xKey} tickMargin={6} interval="preserveStartEnd" />
        <YAxis width={44} tickMargin={4} domain={["auto", "auto"]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            type="linear"
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
            dot={data.length <= 12}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
