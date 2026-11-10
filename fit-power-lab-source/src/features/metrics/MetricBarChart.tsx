import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MetricBarChartProps {
  data: { label: string; value: number }[];
  /** Name of what the bars measure, shown in the tooltip. */
  seriesLabel: string;
  unit: string;
  color: string;
  /** The text alternative of the chart: what it shows and its values. */
  ariaLabel: string;
}

/** Bars by category (zones, cadence bins, weekly load). */
export function MetricBarChart({ data, seriesLabel, unit, color, ariaLabel }: MetricBarChartProps) {
  const config: ChartConfig = { value: { label: seriesLabel, color } };

  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={ariaLabel}
      className="aspect-auto h-48 w-full"
    >
      <BarChart data={data} margin={{ left: 4, right: 12, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickMargin={6} interval="preserveStartEnd" />
        <YAxis width={40} tickMargin={4} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} ${unit}`} />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={2} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
