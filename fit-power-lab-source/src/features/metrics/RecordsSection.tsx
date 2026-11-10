import { useI18n } from "@/app/I18nContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PersonalRecords } from "@/domain/metrics/records";
import { formatNumber, formatPercent } from "@/features/metrics/format";
import {
  altitudeUnit,
  altitudeValue,
  formatAltitude,
  formatDistance,
  formatDuration,
  speedUnit,
  speedValue,
  type UnitSystem,
} from "@/lib/units";

interface RecordsSectionProps {
  records: PersonalRecords;
  units: UnitSystem;
  /** Rides counted, after leaving out repeats. */
  rideCount: number;
}

export function RecordsSection({ records, units, rideCount }: RecordsSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number, digits = 0) => formatNumber(value, locale, digits);
  const date = (d: Date) => d.toLocaleDateString(locale);

  return (
    <>
      {rideCount < 2 ? (
        <p className="text-muted-foreground text-sm">{t("metrics.records.moreRides")}</p>
      ) : null}

      {records.distances.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("metrics.records.noDistances")}</p>
      ) : (
        <Table aria-label={t("metrics.records.distanceTitle")}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("metrics.records.distance")}</TableHead>
              <TableHead>{t("metrics.records.time")}</TableHead>
              <TableHead>{`${t("metrics.records.speed")} (${speedUnit(units)})`}</TableHead>
              <TableHead>{t("metrics.records.ride")}</TableHead>
              <TableHead>{t("metrics.records.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.distances.map((record) => (
              <TableRow key={record.distanceM}>
                <TableCell>{`${record.distanceM / 1000} km`}</TableCell>
                <TableCell>{formatDuration(record.seconds)}</TableCell>
                <TableCell>
                  {n(speedValue((record.distanceM / record.seconds) * 3.6, units), 1)}
                </TableCell>
                <TableCell>{record.label}</TableCell>
                <TableCell>{date(record.startTime)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {records.climbs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("metrics.records.noClimbs")}</p>
      ) : (
        <Table aria-label={t("metrics.records.climbTitle")}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("metrics.records.ride")}</TableHead>
              <TableHead>{t("metrics.records.date")}</TableHead>
              <TableHead>{t("metrics.climbs.length")}</TableHead>
              <TableHead>{t("metrics.climbs.gain")}</TableHead>
              <TableHead>{t("metrics.climbs.grade")}</TableHead>
              <TableHead>{`VAM (${altitudeUnit(units)}/h)`}</TableHead>
              <TableHead>{t("metrics.climbs.category")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.climbs.map((climb) => (
              <TableRow key={`${climb.rideId}-${climb.startM}`}>
                <TableCell>{climb.label}</TableCell>
                <TableCell>{date(climb.startTime)}</TableCell>
                <TableCell>{formatDistance(climb.lengthM / 1000, units, 2)}</TableCell>
                <TableCell>{formatAltitude(climb.gainM, units)}</TableCell>
                <TableCell>{formatPercent(climb.avgGrade * 100, locale)}</TableCell>
                <TableCell>
                  {climb.vamMh === null
                    ? t("metrics.value.na")
                    : n(altitudeValue(climb.vamMh, units))}
                </TableCell>
                <TableCell>{t(`metrics.category.${climb.category}`)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
