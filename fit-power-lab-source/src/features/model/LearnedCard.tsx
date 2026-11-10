import { useMemo } from "react";
import { useAnalyses, useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { learnCalibration } from "@/domain/model/learn";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";

/** Idea 35: a least-squares scale learned from every loaded ride that carries measured power. */
export function LearnedCard() {
  const { t } = useI18n();
  const { model } = useModelInputs();
  const analyses = useAnalyses();
  const { setModel } = useAppActions();

  const learned = useMemo(
    () =>
      learnCalibration(analyses.map((a) => ({ ride: a.analysis.ride, watts: a.analysis.watts }))),
    [analyses],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.learn.title")}</CardTitle>
        <CardDescription>{t("model.learn.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {learned.kind === "none" ? (
          <p className="text-muted-foreground text-sm">{t("model.learn.none")}</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              {t("model.learn.result", {
                rides: learned.rides,
                samples: learned.samples,
                scale: trimNumber(learned.scale, 3),
              })}
            </p>
            <p className="text-sm">
              {t("model.learn.error", {
                before: trimNumber(learned.rmseBeforeW, 1),
                after: trimNumber(learned.rmseAfterW, 1),
              })}
            </p>
            <div>
              <Button
                type="button"
                onClick={() =>
                  setModel({
                    calibrationFactor: Number((model.calibrationFactor * learned.scale).toFixed(4)),
                  })
                }
              >
                {t("model.learn.apply")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
