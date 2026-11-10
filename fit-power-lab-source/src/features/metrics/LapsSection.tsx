import { useI18n } from "@/app/I18nContext";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Lap } from "@/domain/metrics/laps";
import { formatNumber } from "@/features/metrics/format";
import {
  distanceUnit,
  distanceValue,
  formatDuration,
  speedUnit,
  speedValue,
  type UnitSystem,
} from "@/lib/units";

interface LapsSectionProps {
  laps: Lap[];
  units: UnitSystem;
}

export function LapsSection({ laps, units }: LapsSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number, digits = 0) => formatNumber(value, locale, digits);

  if (laps.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("metrics.laps.none")}</p>;
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {t("metrics.laps.intro", { length: `1 ${distanceUnit(units)}` })}
      </p>
      <div className="max-h-96 overflow-y-auto">
        <Table aria-label={t("metrics.laps.title")}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("metrics.laps.lap")}</TableHead>
              <TableHead>{`${t("metrics.laps.distance")} (${distanceUnit(units)})`}</TableHead>
              <TableHead>{t("metrics.laps.time")}</TableHead>
              <TableHead>{`${t("metrics.laps.speed")} (${speedUnit(units)})`}</TableHead>
              <TableHead>{t("metrics.laps.power")}</TableHead>
              <TableHead>{t("metrics.laps.heartRate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {laps.map((lap) => (
              <TableRow key={lap.index}>
                <TableCell>
                  {lap.index}{" "}
                  {lap.partial ? (
                    <Badge variant="outline">{t("metrics.laps.partial")}</Badge>
                  ) : null}
                </TableCell>
                <TableCell>{n(distanceValue(lap.distanceM / 1000, units), 2)}</TableCell>
                <TableCell>{formatDuration(lap.seconds)}</TableCell>
                <TableCell>{n(speedValue(lap.speedMs * 3.6, units), 1)}</TableCell>
                <TableCell>{n(lap.avgWatts)}</TableCell>
                <TableCell>
                  {lap.avgHeartRate === null ? t("metrics.value.na") : n(lap.avgHeartRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
