import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Ride } from "@/domain/ride";
import { buildSeries, type SeriesKey } from "@/domain/series";
import { overlaySeries, type OverlayConversion } from "@/features/library/compareData";
import {
  altitudeUnit,
  altitudeValue,
  distanceUnit,
  distanceValue,
  speedUnit,
  speedValue,
  type UnitSystem,
} from "@/lib/units";

export interface CompareSide {
  name: string;
  ride: Ride;
  watts: number[];
}

const KEYS: SeriesKey[] = ["speed", "power", "altitude"];

function unitsFor(key: SeriesKey, units: UnitSystem): { label: string; y: (v: number) => number } {
  if (key === "speed") return { label: speedUnit(units), y: (v) => speedValue(v, units) };
  if (key === "altitude") return { label: altitudeUnit(units), y: (v) => altitudeValue(v, units) };
  return { label: "W", y: (v) => v };
}

/** Speed, power and altitude by distance, one line per ride (the second one dashed). */
export function CompareCharts({ a, b }: { a: CompareSide; b: CompareSide }) {
  const { t } = useI18n();
  const { units } = useAppState();
  const setA = buildSeries(a.ride, a.watts).available;
  const setB = buildSeries(b.ride, b.watts).available;
  const config: ChartConfig = {
    a: { label: a.name, color: "#2563eb" },
    b: { label: b.name, color: "#ea580c" },
  };

  return (
    <section
      aria-label={t("library.compare.title", { a: a.name, b: b.name })}
      className="grid gap-4"
    >
      {KEYS.map((key) => {
        const seriesA = setA.find((s) => s.key === key);
        const seriesB = setB.find((s) => s.key === key);
        const unit = unitsFor(key, units);
        const convert: OverlayConversion = { x: (km) => distanceValue(km, units), y: unit.y };
        const data = overlaySeries(seriesA, seriesB, convert);
        if (data.length === 0) return null;

        const range = (side: "a" | "b") => {
          const values = data.flatMap((p) => (p[side] === undefined ? [] : [p[side]]));
          return values.length === 0
            ? [t("library.compare.chartNone"), t("library.compare.chartNone")]
            : [String(Math.min(...values)), String(Math.max(...values))];
        };
        const [aFrom, aTo] = range("a");
        const [bFrom, bTo] = range("b");
        const title = t(`library.compare.chart.${key}`);

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{unit.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={config}
                role="img"
                aria-label={t("library.compare.chartLabel", {
                  title,
                  unit: unit.label,
                  a: a.name,
                  b: b.name,
                  aFrom: aFrom ?? "",
                  aTo: aTo ?? "",
                  bFrom: bFrom ?? "",
                  bTo: bTo ?? "",
                })}
                className="aspect-auto h-48 w-full"
              >
                <LineChart data={data} margin={{ left: 4, right: 12, top: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(x: number) => `${x.toFixed(1)} ${distanceUnit(units)}`}
                    tickMargin={6}
                  />
                  <YAxis width={48} domain={["auto", "auto"]} tickMargin={4} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_label, payload) => {
                          const x: unknown = payload?.[0]?.payload?.x;
                          return typeof x === "number"
                            ? `${x.toFixed(2)} ${distanceUnit(units)}`
                            : "";
                        }}
                        formatter={(value, name) =>
                          `${config[String(name)]?.label ?? name}: ${value} ${unit.label}`
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    dataKey="a"
                    type="linear"
                    stroke="var(--color-a)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  <Line
                    dataKey="b"
                    type="linear"
                    stroke="var(--color-b)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
