import { useI18n } from "@/app/I18nContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MAX_DIP_M,
  MIN_CLIMB_GAIN_M,
  MIN_CLIMB_GRADE,
  MIN_CLIMB_LENGTH_M,
} from "@/domain/metrics/climbs";
import { wattsPerKg } from "@/domain/metrics/energy";
import { HYSTERESIS_M } from "@/domain/metrics/elevation";
import type { RideMetrics } from "@/domain/metrics/rideMetrics";
import { formatNumber, formatPercent } from "@/features/metrics/format";
import { Stat, StatGrid } from "@/features/metrics/Stat";
import {
  altitudeUnit,
  altitudeValue,
  distanceUnit,
  distanceValue,
  formatAltitude,
  formatDistance,
  formatDuration,
  type UnitSystem,
} from "@/lib/units";

interface TerrainSectionProps {
  metrics: RideMetrics;
  /** Ascent in the session message of the file, for the whole ride. */
  deviceAscentM: number | undefined;
  units: UnitSystem;
  riderKg: number;
}

export function TerrainSection({ metrics, deviceAscentM, units, riderKg }: TerrainSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number, digits = 0) => formatNumber(value, locale, digits);
  const { elevation, climbs } = metrics;

  return (
    <>
      <StatGrid>
        <Stat label={t("metrics.stat.ascent")} value={formatAltitude(elevation.ascentM, units)} />
        <Stat label={t("metrics.stat.descent")} value={formatAltitude(elevation.descentM, units)} />
        <Stat
          label={t("metrics.stat.deviceAscent")}
          value={
            deviceAscentM === undefined
              ? t("metrics.value.notRecorded")
              : formatAltitude(deviceAscentM, units)
          }
        />
      </StatGrid>
      <p className="text-muted-foreground text-xs">
        {t("metrics.terrain.hysteresis", { value: formatAltitude(HYSTERESIS_M, units, 1) })}
      </p>

      {climbs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("metrics.climbs.none")}</p>
      ) : (
        <Table aria-label={t("metrics.climbs.title")}>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>{t("metrics.climbs.start")}</TableHead>
              <TableHead>{t("metrics.climbs.length")}</TableHead>
              <TableHead>{t("metrics.climbs.gain")}</TableHead>
              <TableHead>{t("metrics.climbs.grade")}</TableHead>
              <TableHead>{t("metrics.climbs.category")}</TableHead>
              <TableHead>{`VAM (${altitudeUnit(units)}/h)`}</TableHead>
              <TableHead>{t("metrics.climbs.power")}</TableHead>
              <TableHead>W/kg</TableHead>
              <TableHead>{t("metrics.climbs.time")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {climbs.map((climb, i) => {
              const perKg = wattsPerKg(climb.avgWatts, riderKg);
              return (
                <TableRow key={climb.startM}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{formatDistance(climb.startM / 1000, units, 1)}</TableCell>
                  <TableCell>{formatDistance(climb.lengthM / 1000, units, 2)}</TableCell>
                  <TableCell>{formatAltitude(climb.gainM, units)}</TableCell>
                  <TableCell>{formatPercent(climb.avgGrade * 100, locale)}</TableCell>
                  <TableCell>{t(`metrics.category.${climb.category}`)}</TableCell>
                  <TableCell>
                    {climb.vamMh === null
                      ? t("metrics.value.na")
                      : n(altitudeValue(climb.vamMh, units))}
                  </TableCell>
                  <TableCell>{`${n(climb.avgWatts)} W`}</TableCell>
                  <TableCell>{perKg === null ? t("metrics.value.na") : n(perKg, 2)}</TableCell>
                  <TableCell>{formatDuration(climb.movingS)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <p className="text-muted-foreground text-xs">
        {t("metrics.climbs.rule", {
          length: `${n(distanceValue(MIN_CLIMB_LENGTH_M / 1000, units), 2)} ${distanceUnit(units)}`,
          grade: formatPercent(MIN_CLIMB_GRADE * 100, locale, 0),
          gain: formatAltitude(MIN_CLIMB_GAIN_M, units),
          dip: formatAltitude(MAX_DIP_M, units),
        })}
      </p>
    </>
  );
}
