import { useAppStateOptional } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizePower, type Analysis } from "@/domain/analysis";
import { sliceRide } from "@/domain/slice";
import { formatDistance } from "@/lib/units";

interface AnalysisSummaryProps {
  fileName: string;
  analysis: Analysis;
}

/** The figures of the ride, or of the stretch selected on the charts when there is one. */
export function AnalysisSummary({ fileName, analysis }: AnalysisSummaryProps) {
  const { t } = useI18n();
  const state = useAppStateOptional();
  const units = state?.units ?? "metric";
  const range = state?.range ?? null;

  const part = sliceRide(analysis.ride, analysis.watts, range);
  const summary = summarizePower(part.watts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fileName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        {range ? (
          <p className="text-muted-foreground text-sm">
            {t("summary.range", {
              from: formatDistance(Math.min(range.fromKm, range.toKm), units),
              to: formatDistance(Math.max(range.fromKm, range.toKm), units),
            })}
          </p>
        ) : null}
        <p>{t("summary.average", { watts: summary.averagePedalling })}</p>
        <p>{t("summary.peak", { watts: summary.max })}</p>
        <p>{t("summary.share", { percent: Math.round(summary.pedallingShare * 100) })}</p>
      </CardContent>
    </Card>
  );
}
