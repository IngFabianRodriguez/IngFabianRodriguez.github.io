import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BAND_UNCERTAINTY, estimatePowerBand } from "@/domain/model/band";
import { estimatePower } from "@/domain/power";
import { summarizePower } from "@/domain/analysis";
import { downsample, type SeriesPoint } from "@/domain/series";
import { NeedsRide } from "@/features/model/NeedsRide";
import { useModelInputs } from "@/features/model/useModelInputs";
import { distanceUnit, distanceValue, weightUnit, weightValue } from "@/lib/units";

const CHART_POINTS = 150;
const COLORS = { estimate: "#dc2626", band: "#fca5a5" };

/** Idea 27: the minimum-maximum power band, as a preview with its numbers. */
import { formatKmTick } from "@/features/model/format";

export function UncertaintyCard() {
  const { t } = useI18n();
  const { units, ride, params } = useModelInputs();

  const data = useMemo(() => {
    if (!ride || !params) return null;
    const estimate = estimatePower(ride, params);
    const band = estimatePowerBand(ride, params);
    const toPoints = (values: number[]): SeriesPoint[] =>
      ride.samples.map((s, i) => ({
        x: distanceValue(s.distance / 1000, units),
        y: values[i] ?? 0,
      }));
    const mid = downsample(toPoints(estimate), CHART_POINTS);
    const low = downsample(toPoints(band.low), CHART_POINTS);
    const high = downsample(toPoints(band.high), CHART_POINTS);
    return {
      summary: {
        low: summarizePower(band.low),
        estimate: summarizePower(estimate),
        high: summarizePower(band.high),
      },
      chart: mid.map((p, i) => ({
        x: p.x,
        estimate: p.y,
        band: [low[i]?.y ?? p.y, high[i]?.y ?? p.y] as [number, number],
      })),
    };
  }, [ride, params, units]);

  const config: ChartConfig = {
    estimate: { label: t("model.band.estimate"), color: COLORS.estimate },
    band: { label: t("model.band.range"), color: COLORS.band },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.band.title")}</CardTitle>
        <CardDescription>
          {t("model.band.description", {
            cdA: BAND_UNCERTAINTY.cdA * 100,
            crr: BAND_UNCERTAINTY.crr * 100,
            mass: Math.round(weightValue(BAND_UNCERTAINTY.massKg, units) * 10) / 10,
            unit: weightUnit(units),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!data ? (
          <NeedsRide />
        ) : (
          <>
            <ChartContainer
              config={config}
              role="img"
              aria-label={t("model.band.chartLabel", {
                low: data.summary.low.averagePedalling,
                high: data.summary.high.averagePedalling,
                unit: distanceUnit(units),
              })}
              className="aspect-auto h-40 w-full"
            >
              <ComposedChart data={data.chart} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickCount={5}
                  tickFormatter={formatKmTick}
                />
                <YAxis width={40} />
                <Area
                  dataKey="band"
                  stroke="none"
                  fill="var(--color-band)"
                  isAnimationActive={false}
                />
                <Line
                  dataKey="estimate"
                  stroke="var(--color-estimate)"
                  dot={false}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ChartContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="sr-only">{t("model.band.figure")}</span>
                  </TableHead>
                  <TableHead>{t("model.band.low")}</TableHead>
                  <TableHead>{t("model.band.estimate")}</TableHead>
                  <TableHead>{t("model.band.high")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableHead scope="row">{t("model.band.average")}</TableHead>
                  <TableCell>{data.summary.low.averagePedalling} W</TableCell>
                  <TableCell>{data.summary.estimate.averagePedalling} W</TableCell>
                  <TableCell>{data.summary.high.averagePedalling} W</TableCell>
                </TableRow>
                <TableRow>
                  <TableHead scope="row">{t("model.band.peak")}</TableHead>
                  <TableCell>{data.summary.low.max} W</TableCell>
                  <TableCell>{data.summary.estimate.max} W</TableCell>
                  <TableCell>{data.summary.high.max} W</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
