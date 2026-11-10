import { useMemo } from "react";
import { useAnalysis, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { summarizePower } from "@/domain/analysis";
import { sliceRide } from "@/domain/slice";
import { formatDistance } from "@/lib/units";

/** The estimate for the active ride; it moves as soon as a value of the model changes. */
export function EstimateSummary() {
  const { t } = useI18n();
  const { range, units } = useAppState();
  const analysis = useAnalysis();

  const summary = useMemo(
    () => (analysis ? summarizePower(sliceRide(analysis.ride, analysis.watts, range).watts) : null),
    [analysis, range],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.summary.title")}</CardTitle>
        <CardDescription>
          {range
            ? t("model.summary.stretch", {
                from: formatDistance(Math.min(range.fromKm, range.toKm), units, 2),
                to: formatDistance(Math.max(range.fromKm, range.toKm), units, 2),
              })
            : t("model.summary.wholeRide")}
        </CardDescription>
      </CardHeader>
      <CardContent aria-live="polite">
        {summary ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">{t("model.summary.average")}</dt>
              <dd className="text-lg font-semibold">{summary.averagePedalling} W</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("model.summary.peak")}</dt>
              <dd className="text-lg font-semibold">{summary.max} W</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("model.summary.share")}</dt>
              <dd className="text-lg font-semibold">{Math.round(summary.pedallingShare * 100)}%</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">{t("model.summary.none")}</p>
        )}
      </CardContent>
    </Card>
  );
}
