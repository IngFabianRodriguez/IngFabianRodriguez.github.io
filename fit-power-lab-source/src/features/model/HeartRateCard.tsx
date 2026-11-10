import { useMemo } from "react";
import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { powerHeartRateFit } from "@/domain/model/heartRate";
import { estimatePower } from "@/domain/power";
import { NeedsRide } from "@/features/model/NeedsRide";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";
import { formatDistance } from "@/lib/units";

/** Idea 33: the rider's own relation between power and heart rate, and the stretches that break it. */
export function HeartRateCard() {
  const { t } = useI18n();
  const { units, ride, params } = useModelInputs();
  const { setRange } = useAppActions();

  const fit = useMemo(
    () => (ride && params ? powerHeartRateFit(ride, estimatePower(ride, params)) : null),
    [ride, params],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.hr.title")}</CardTitle>
        <CardDescription>{t("model.hr.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!ride || !params ? (
          <NeedsRide />
        ) : !fit ? (
          <p className="text-muted-foreground text-sm">{t("model.hr.none")}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {t("model.hr.slope", { slope: trimNumber(fit.slope * 100, 1) })}
            </p>
            <p className="text-sm">{t("model.hr.intercept", { bpm: Math.round(fit.intercept) })}</p>
            <p className="text-sm">
              {t("model.hr.fit", { r2: trimNumber(fit.r2, 2), blocks: fit.blocks })}
            </p>
            {fit.outliers.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("model.hr.noOutliers")}</p>
            ) : (
              <ul className="grid gap-2">
                {fit.outliers.map((o) => {
                  const from = formatDistance(o.fromKm, units, 2);
                  const to = formatDistance(o.toKm, units, 2);
                  return (
                    <li
                      key={`${o.fromKm}-${o.toKm}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {from} – {to}:{" "}
                        {t(o.direction === "hrHigh" ? "model.hr.high" : "model.hr.low", {
                          bpm: Math.round(Math.abs(o.residualBpm)),
                        })}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRange({ fromKm: o.fromKm, toKm: o.toKm })}
                      >
                        {t("model.hr.select", { from, to })}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
