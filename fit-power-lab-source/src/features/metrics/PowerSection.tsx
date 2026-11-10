import { useI18n } from "@/app/I18nContext";
import { GROSS_EFFICIENCY } from "@/domain/metrics/energy";
import type { RideMetrics } from "@/domain/metrics/rideMetrics";
import { formatNumber, formatPercent } from "@/features/metrics/format";
import { Stat, StatGrid } from "@/features/metrics/Stat";

interface PowerSectionProps {
  metrics: RideMetrics;
  /** The FTP in use (typed by the rider or estimated), if any. */
  ftp: number | null;
  /** Calories in the session message of the file, for the whole ride. */
  deviceCalories: number | undefined;
}

export function PowerSection({ metrics, ftp, deviceCalories }: PowerSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number, digits = 0) => formatNumber(value, locale, digits);

  const tooShort = t("metrics.value.tooShort");
  const needsFtp = t("metrics.value.needsFtp");
  const { stress, decoupling } = metrics;
  const withStress = (format: (s: NonNullable<typeof stress>) => string) =>
    stress ? format(stress) : ftp === null ? needsFtp : tooShort;

  let decouplingValue = t("metrics.value.needsHeartRate");
  if (metrics.hasHeartRate) {
    decouplingValue = decoupling ? formatPercent(decoupling.percent, locale) : tooShort;
  }

  return (
    <StatGrid>
      <Stat
        label={t("metrics.stat.np")}
        value={metrics.normalizedPower === null ? tooShort : `${n(metrics.normalizedPower)} W`}
      />
      <Stat label={t("metrics.stat.if")} value={withStress((s) => n(s.intensityFactor, 2))} />
      <Stat label={t("metrics.stat.tss")} value={withStress((s) => n(s.tss))} />
      <Stat label={t("metrics.stat.ftpUsed")} value={ftp === null ? needsFtp : `${n(ftp)} W`} />
      <Stat label={t("metrics.stat.avgPower")} value={`${n(metrics.avgWatts)} W`} />
      <Stat
        label={t("metrics.stat.wkg")}
        value={metrics.wattsPerKg === null ? tooShort : `${n(metrics.wattsPerKg, 2)} W/kg`}
      />
      <Stat label={t("metrics.stat.work")} value={`${n(metrics.workKj)} kJ`} />
      <Stat
        label={t("metrics.stat.mechKcal")}
        value={`${n(metrics.mechanicalKcal)} kcal`}
        hint={t("metrics.hint.kcal", { pct: GROSS_EFFICIENCY * 100 })}
      />
      <Stat
        label={t("metrics.stat.deviceKcal")}
        value={
          deviceCalories === undefined
            ? t("metrics.value.notRecorded")
            : `${n(deviceCalories)} kcal`
        }
        {...(deviceCalories === undefined ? {} : { hint: t("metrics.hint.deviceKcal") })}
      />
      <Stat
        label={t("metrics.stat.decoupling")}
        value={decouplingValue}
        {...(decoupling ? { hint: t("metrics.hint.decoupling") } : {})}
      />
    </StatGrid>
  );
}
