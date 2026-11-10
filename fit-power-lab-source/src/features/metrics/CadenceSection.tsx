import { useI18n } from "@/app/I18nContext";
import {
  CADENCE_BIN_RPM,
  MIN_BIN_SECONDS,
  type CadenceHistogram,
  type TorqueSummary,
} from "@/domain/metrics/cadence";
import { formatNumber } from "@/features/metrics/format";
import { MetricBarChart } from "@/features/metrics/MetricBarChart";
import { Stat, StatGrid } from "@/features/metrics/Stat";
import { formatDuration } from "@/lib/units";

interface CadenceSectionProps {
  /** Null when the ride has no cadence sensor data. */
  cadence: CadenceHistogram | null;
  torque: TorqueSummary | null;
}

const binLabel = (startRpm: number) => `${startRpm}-${startRpm + CADENCE_BIN_RPM - 1}`;

export function CadenceSection({ cadence, torque }: CadenceSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number, digits = 0) => formatNumber(value, locale, digits);

  if (cadence === null) {
    return <p className="text-muted-foreground text-sm">{t("metrics.cadence.none")}</p>;
  }

  const minutes = cadence.bins.map((bin) => ({
    label: binLabel(bin.startRpm),
    value: Math.round((bin.seconds / 60) * 10) / 10,
  }));
  const { optimal } = cadence;

  return (
    <>
      <MetricBarChart
        data={minutes}
        seriesLabel={t("metrics.cadence.series")}
        unit="min"
        color="#16a34a"
        ariaLabel={t("metrics.cadence.chart", {
          values: minutes.map((d) => `${d.label} rpm ${n(d.value, 1)}`).join(", "),
        })}
      />
      <StatGrid>
        {optimal ? (
          <Stat
            label={t("metrics.stat.optimalCadence")}
            value={`${binLabel(optimal.startRpm)} rpm`}
            hint={t(
              optimal.basis === "efficiency"
                ? "metrics.cadence.basisEfficiency"
                : "metrics.cadence.basisTime",
              { seconds: MIN_BIN_SECONDS },
            )}
          />
        ) : null}
        <Stat label={t("metrics.stat.coasting")} value={formatDuration(cadence.coastingS)} />
        <Stat
          label={t("metrics.stat.torque")}
          value={torque ? `${n(torque.averageNm, 1)} N·m` : t("metrics.value.na")}
          hint={t("metrics.hint.torque")}
        />
      </StatGrid>
      {torque ? (
        <MetricBarChart
          data={torque.bins.map((bin) => ({
            label: binLabel(bin.startRpm),
            value: Math.round(bin.nm * 10) / 10,
          }))}
          seriesLabel={t("metrics.torque.series")}
          unit="N·m"
          color="#7c3aed"
          ariaLabel={t("metrics.torque.chart", {
            values: torque.bins
              .map((bin) => `${binLabel(bin.startRpm)} rpm ${n(bin.nm, 1)}`)
              .join(", "),
          })}
        />
      ) : null}
    </>
  );
}
