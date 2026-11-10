import { lazy, Suspense, useMemo } from "react";
import { useAnalysis, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rideFigures, type RideFigures } from "@/features/library/compareData";
import {
  formatAltitude,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatTemperature,
  type UnitSystem,
} from "@/lib/units";

const CompareMap = lazy(() =>
  import("@/features/library/CompareMap").then((m) => ({ default: m.CompareMap })),
);
const CompareCharts = lazy(() =>
  import("@/features/library/CompareCharts").then((m) => ({ default: m.CompareCharts })),
);

interface Row {
  key: string;
  value: (f: RideFigures) => number | null;
  /** Shows a value (or a difference, always positive) in the user's units. */
  format: (n: number, units: UnitSystem) => string;
}

const ROWS: Row[] = [
  { key: "distance", value: (f) => f.distanceKm, format: (n, u) => formatDistance(n, u, 2) },
  { key: "moving", value: (f) => f.movingS, format: (n) => formatDuration(n) },
  { key: "elapsed", value: (f) => f.elapsedS, format: (n) => formatDuration(n) },
  { key: "avgSpeed", value: (f) => f.avgSpeedKmh, format: (n, u) => formatSpeed(n, u) },
  { key: "maxSpeed", value: (f) => f.maxSpeedKmh, format: (n, u) => formatSpeed(n, u) },
  { key: "ascent", value: (f) => f.ascentM, format: (n, u) => formatAltitude(n, u) },
  { key: "avgPower", value: (f) => f.avgPowerW, format: (n) => `${Math.round(n)} W` },
  { key: "maxPower", value: (f) => f.maxPowerW, format: (n) => `${Math.round(n)} W` },
  { key: "avgHeartRate", value: (f) => f.avgHeartRate, format: (n) => `${Math.round(n)} bpm` },
  { key: "avgCadence", value: (f) => f.avgCadence, format: (n) => `${Math.round(n)} rpm` },
  {
    key: "avgTemperature",
    value: (f) => f.avgTemperatureC,
    format: (n, u) => formatTemperature(n, u),
  },
];

const NONE = "–";

function difference(row: Row, a: number | null, b: number | null, units: UnitSystem): string {
  if (a === null || b === null) return NONE;
  const delta = b - a;
  if (Math.abs(delta) < 1e-9) return row.format(0, units);
  return `${delta > 0 ? "+" : "−"}${row.format(Math.abs(delta), units)}`;
}

/** The active ride next to the one chosen to compare: figures, charts and both routes. */
export function ComparePanel() {
  const { t } = useI18n();
  const { rides, activeId, compareId, units } = useAppState();
  const first = useAnalysis(activeId ?? "none");
  const second = useAnalysis(compareId ?? "none");
  const loadedA = rides.find((r) => r.id === activeId);
  const loadedB = rides.find((r) => r.id === compareId);

  const figures = useMemo(
    () =>
      first && second
        ? { a: rideFigures(first.ride, first.watts), b: rideFigures(second.ride, second.watts) }
        : null,
    [first, second],
  );

  if (!first || !second || !loadedA || !loadedB || !figures || activeId === compareId) return null;
  const a = { name: loadedA.fileName, ride: first.ride, watts: first.watts };
  const b = { name: loadedB.fileName, ride: second.ride, watts: second.watts };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("library.compare.title", { a: a.name, b: b.name })}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Table>
          <TableCaption>{t("library.compare.caption")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("library.compare.col.figure")}</TableHead>
              <TableHead scope="col">{a.name}</TableHead>
              <TableHead scope="col">{b.name}</TableHead>
              <TableHead scope="col">{t("library.compare.col.diff")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => {
              const va = row.value(figures.a);
              const vb = row.value(figures.b);
              return (
                <TableRow key={row.key}>
                  <TableHead scope="row">{t(`library.compare.${row.key}`)}</TableHead>
                  <TableCell>{va === null ? NONE : row.format(va, units)}</TableCell>
                  <TableCell>{vb === null ? NONE : row.format(vb, units)}</TableCell>
                  <TableCell>{difference(row, va, vb, units)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Suspense
          fallback={<p className="text-muted-foreground text-sm">{t("library.compare.loading")}</p>}
        >
          <CompareCharts a={a} b={b} />
          <CompareMap a={a} b={b} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
