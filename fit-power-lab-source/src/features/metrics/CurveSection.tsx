import { useI18n } from "@/app/I18nContext";
import type { CurvePoint } from "@/domain/metrics/powerCurve";
import { formatCurveDuration, formatNumber } from "@/features/metrics/format";
import { MetricLineChart } from "@/features/metrics/MetricLineChart";
import { Stat, StatGrid } from "@/features/metrics/Stat";

interface CurveSectionProps {
  curve: CurvePoint[];
  /** 95% of the best 20 minutes, or null when the ride is shorter. */
  ftpEstimate: number | null;
}

export function CurveSection({ curve, ftpEstimate }: CurveSectionProps) {
  const { t, locale } = useI18n();
  const n = (value: number) => formatNumber(value, locale);

  if (curve.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("metrics.curve.tooShort")}</p>;
  }

  const data = curve.map((p) => ({
    label: formatCurveDuration(p.durationS),
    watts: Math.round(p.watts),
  }));
  const values = data.map((d) => `${d.label} ${n(d.watts)} W`).join(", ");

  return (
    <>
      <MetricLineChart
        data={data}
        xKey="label"
        series={[{ key: "watts", label: t("metrics.curve.series"), color: "#dc2626" }]}
        ariaLabel={t("metrics.curve.chart", { values })}
      />
      <StatGrid>
        <Stat
          label={t("metrics.stat.ftpEstimate")}
          value={ftpEstimate === null ? t("metrics.value.tooShort") : `${n(ftpEstimate)} W`}
          hint={t("metrics.hint.ftpEstimate")}
        />
      </StatGrid>
    </>
  );
}
