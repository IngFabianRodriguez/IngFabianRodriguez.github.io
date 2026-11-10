import { useI18n } from "@/app/I18nContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ZoneTime } from "@/domain/metrics/zones";
import { formatNumber, formatPercent, zoneRange } from "@/features/metrics/format";
import { MetricBarChart } from "@/features/metrics/MetricBarChart";
import { formatDuration } from "@/lib/units";

interface ZoneBlockProps {
  title: string;
  zones: ZoneTime[];
  unit: string;
  /** Picks the zone names: `metrics.zone.<kind>.<number>`. */
  kind: "power" | "heartRate";
  color: string;
}

function ZoneBlock({ title, zones, unit, kind, color }: ZoneBlockProps) {
  const { t, locale } = useI18n();
  const total = zones.reduce((sum, z) => sum + z.seconds, 0);
  const data = zones.map((z) => ({
    label: `Z${z.zone}`,
    value: Math.round((z.seconds / 60) * 10) / 10,
  }));
  const values = data.map((d) => `${d.label} ${formatNumber(d.value, locale, 1)}`).join(", ");

  return (
    <div className="grid gap-3">
      <MetricBarChart
        data={data}
        seriesLabel={t("metrics.zones.series")}
        unit="min"
        color={color}
        ariaLabel={t("metrics.zones.chart", { title, values })}
      />
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead>{t("metrics.zones.zone")}</TableHead>
            <TableHead>{t("metrics.zones.range")}</TableHead>
            <TableHead>{t("metrics.zones.time")}</TableHead>
            <TableHead>{t("metrics.zones.share")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((z) => (
            <TableRow key={z.zone}>
              <TableCell>{`Z${z.zone} ${t(`metrics.zone.${kind}.${z.zone}`)}`}</TableCell>
              <TableCell>{zoneRange(z.from, z.to, unit)}</TableCell>
              <TableCell>{formatDuration(z.seconds)}</TableCell>
              <TableCell>
                {total > 0 ? formatPercent((z.seconds / total) * 100, locale) : "0 %"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ZonesSectionProps {
  powerZones: ZoneTime[];
  heartRateZones: ZoneTime[];
  hasHeartRate: boolean;
}

export function ZonesSection({ powerZones, heartRateZones, hasHeartRate }: ZonesSectionProps) {
  const { t } = useI18n();
  const message = (key: string) => <p className="text-muted-foreground text-sm">{t(key)}</p>;

  return (
    <>
      {powerZones.length === 0 ? (
        message("metrics.zones.needsFtp")
      ) : (
        <ZoneBlock
          title={t("metrics.zones.powerTitle")}
          zones={powerZones}
          unit="W"
          kind="power"
          color="#dc2626"
        />
      )}
      {!hasHeartRate ? (
        message("metrics.zones.noHeartRate")
      ) : heartRateZones.length === 0 ? (
        message("metrics.zones.needsMaxHr")
      ) : (
        <ZoneBlock
          title={t("metrics.zones.heartRateTitle")}
          zones={heartRateZones}
          unit="bpm"
          kind="heartRate"
          color="#e11d48"
        />
      )}
    </>
  );
}
